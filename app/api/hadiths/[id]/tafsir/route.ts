import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { explainHadith } from "@/lib/ai/hadith-tafsir";

/**
 * POST /api/hadiths/[id]/tafsir — AI explanation («تفسير الحديث») of one hadith.
 *
 * The hadith text is fetched verbatim from the database and passed to the LLM;
 * the generated explanation is returned transiently and NEVER persisted, so the
 * corpus rows stay untouched. This is an educational explanation, not a ruling:
 * `lib/ai/hadith-tafsir.ts` forbids fatwas, invented gradings and unattributed
 * scholarly opinions, and the UI shows the AI disclaimer.
 *
 * The request is bounded by `TAFSIR_TIMEOUT_MS` (default 30s) and by the
 * client's abort signal (closing the dialog cancels the model call).
 */
export const maxDuration = 60;

function timeoutMs(): number {
  const raw = Number.parseInt(process.env.TAFSIR_TIMEOUT_MS ?? "", 10);
  if (Number.isNaN(raw)) return 30_000;
  return Math.min(60_000, Math.max(5_000, raw));
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || typeof id !== "string" || id.length > 200) {
    return NextResponse.json(
      { success: false, code: "bad_request", error: "hadith id is required." },
      { status: 400 },
    );
  }

  let row;
  try {
    row = await prisma.hadith.findUnique({
      where: { id },
      select: {
        id: true,
        text: true,
        topic: true,
        sanad: true,
        book: { select: { title: true } },
      },
    });
  } catch (error) {
    console.error("POST /api/hadiths/[id]/tafsir DB lookup failed:", error);
    return NextResponse.json(
      {
        success: false,
        code: "db_unavailable",
        error: "Database unavailable. Start Postgres and retry.",
      },
      { status: 503 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { success: false, code: "not_found", error: "Hadith not found" },
      { status: 404 },
    );
  }

  if (!row.text?.trim()) {
    return NextResponse.json(
      {
        success: false,
        code: "empty_text",
        error: "This hadith has no text to explain.",
      },
      { status: 422 },
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs());

  try {
    const tafsir = await explainHadith(
      {
        text: row.text,
        bookTitle: row.book.title,
        topic: row.topic ?? "",
        sanad: Array.isArray(row.sanad) ? row.sanad : [],
      },
      { signal: AbortSignal.any([controller.signal, request.signal]) },
    );

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        ...tafsir,
        aiGenerated: true,
      },
    });
  } catch (error) {
    if (timedOut) {
      return NextResponse.json(
        {
          success: false,
          code: "timeout",
          error: "The explanation timed out. Try again.",
        },
        { status: 504 },
      );
    }
    // The client closed the dialog — the request was cancelled, not failed.
    // Do not log it as a generation error.
    if (request.signal.aborted) {
      return NextResponse.json(
        { success: false, code: "aborted", error: "Request aborted." },
        { status: 499 },
      );
    }
    console.error("POST /api/hadiths/[id]/tafsir generation failed:", error);
    return NextResponse.json(
      {
        success: false,
        code: "generation_failed",
        error: "Could not generate the explanation. Try again.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
