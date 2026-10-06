import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { estimateHadithDetails } from "@/lib/ai/hadith-details";

/**
 * GET /api/hadiths/[id] — sanad + hukm + source for one hadith.
 *
 * - DB first: sanad/hukm/alternatives + book source are returned verbatim.
 * - AI fallback: real-corpus rows synced from Shamela have no sanad/hukm
 *   (sanad=[] / hukm="غير محكوم" — see scripts/sync_shamela.py). When either
 *   is missing, the LLM ESTIMATES it. The estimate is returned transiently
 *   with `aiGenerated: true` and is NEVER written back to the DB, so the
 *   DB-sourced guarantee for hadith content stays intact. The UI must label
 *   it as a machine estimate, not a scholarly ruling.
 */
export const maxDuration = 60;

/** Hukm values that mean "no grade stored" (sync placeholder / blanks). */
function isMissingHukm(hukm: string | null | undefined): boolean {
  const v = (hukm ?? "").trim();
  return v === "" || v === "غير محكوم" || v === "غير معروف" || v === "-" || v === "؟";
}

/**
 * Max wait for the AI fallback (ms). Past this the request is aborted and the
 * UI is told "not found" — the dialog must never hang on a slow model.
 * Overridable via HADITH_DETAILS_TIMEOUT_MS (default 3000).
 */
function aiTimeoutMs(): number {
  const raw = Number.parseInt(process.env.HADITH_DETAILS_TIMEOUT_MS ?? "", 10);
  if (Number.isNaN(raw)) return 3000;
  return Math.min(30_000, Math.max(1000, raw));
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ success: false, error: "hadith id is required." }, { status: 400 });
  }

  let row;
  try {
    row = await prisma.hadith.findUnique({
      where: { id },
      include: {
        book: {
          select: {
            slug: true,
            title: true,
            muhaqqiq: true,
            edition: true,
            publisher: true,
            pdfUrl: true,
          },
        },
        alternatives: { select: { hukm: true, scholar: true } },
      },
    });
  } catch (error) {
    console.error("GET /api/hadiths/[id] DB lookup failed:", error);
    return NextResponse.json(
      { success: false, error: "Database unavailable. Start Postgres and retry." },
      { status: 503 },
    );
  }

  if (!row) {
    return NextResponse.json({ success: false, error: "Hadith not found." }, { status: 404 });
  }

  const dbSanad: string[] = Array.isArray(row.sanad) ? row.sanad : [];
  const missingSanad = dbSanad.length === 0;
  const missingHukm = isMissingHukm(row.hukm);
  const source = {
    bookTitle: row.book.title,
    bookSlug: row.book.slug,
    muhaqqiq: row.book.muhaqqiq ?? "",
    edition: row.book.edition ?? "",
    publisher: row.book.publisher ?? "",
    volume: row.volume,
    page: row.page,
    hadithNumber: row.hadithNumber,
    pdfUrl: row.pdfUrl ?? row.book.pdfUrl ?? "#",
  };

  // Complete in the DB — no AI needed.
  if (!missingSanad && !missingHukm) {
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        text: row.text,
        sanad: dbSanad,
        hukm: row.hukm,
        scholar: row.scholar ?? "",
        alternatives: row.alternatives.map((a) => ({
          hukm: a.hukm,
          scholar: a.scholar ?? "",
        })),
        source,
        topic: row.topic ?? "",
        aiGenerated: false,
        missingFromDb: { sanad: false, hukm: false },
      },
    });
  }

  // Partial / missing — ask the LLM to estimate (transient, never persisted).
  // Bounded by aiTimeoutMs(): on timeout the LLM request is aborted and the
  // client gets the DB partial with `timedOut: true` ("not found").
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, aiTimeoutMs());
  try {
    const ai = await estimateHadithDetails(row.text, row.book.title, {
      signal: controller.signal,
    });
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        text: row.text,
        sanad: missingSanad ? ai.sanad : dbSanad,
        hukm: missingHukm ? ai.hukm : row.hukm,
        scholar: missingHukm ? ai.scholar : (row.scholar ?? ""),
        alternatives: row.alternatives.map((a) => ({
          hukm: a.hukm,
          scholar: a.scholar ?? "",
        })),
        source,
        topic: row.topic ?? "",
        aiGenerated: true,
        timedOut: false,
        missingFromDb: { sanad: missingSanad, hukm: missingHukm },
      },
    });
  } catch (error) {
    if (!timedOut) {
      console.warn("[hadith-details] AI fallback failed, returning DB partial:", error);
    }
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        text: row.text,
        sanad: dbSanad,
        hukm: missingHukm ? "" : row.hukm,
        scholar: row.scholar ?? "",
        alternatives: row.alternatives.map((a) => ({
          hukm: a.hukm,
          scholar: a.scholar ?? "",
        })),
        source,
        topic: row.topic ?? "",
        aiGenerated: false,
        aiError: true,
        timedOut,
        missingFromDb: { sanad: missingSanad, hukm: missingHukm },
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
