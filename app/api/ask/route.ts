import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { answerQuestion } from "@/lib/ai/pipeline";
import { parseAskBody } from "@/lib/validations/ask";

/**
 * POST /api/ask — the 6-step RAG flow:
 * rewrite → BGE-M3/pgvector top-30 → reranker top-10 (vs original Q)
 * → direct Postgres fetch → sorted + cutoff-filtered display payload.
 *
 * Vercel: the full pipeline (rewrite + embed + rerank + LLM answer) regularly
 * exceeds the 10s default function limit — allow up to 60s (Hobby max with
 * Fluid Compute; raise to 300 on a Pro plan).
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAskBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  // Resolve book scope: accept a DB id OR a slug (frontend sends slug).
  let bookId: string | null = null;
  if (parsed.bookScope) {
    try {
      const book = await prisma.book.findFirst({
        where: { OR: [{ id: parsed.bookScope }, { slug: parsed.bookScope }] },
        select: { id: true },
      });
      if (!book) {
        return NextResponse.json(
          { success: false, error: "Unknown book scope." },
          { status: 400 },
        );
      }
      bookId = book.id;
    } catch (error) {
      console.error("POST /api/ask book lookup failed:", error);
      return NextResponse.json(
        { success: false, error: "Database unavailable. Start Postgres (`npm run db:up`) and retry." },
        { status: 503 },
      );
    }
  }

  try {
    const out = await answerQuestion(parsed.question, {
      bookId,
      userId: parsed.userId,
      retrievalOnly: parsed.retrievalOnly,
    });
    return NextResponse.json({ success: true, data: out });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    const status = /empty|required/i.test(message)
      ? 400
      : /indexed|embed|database|connect|api key|API_KEY|unauthorized|401|invalid.*key|restart/i.test(message)
        ? 503
        : 500;
    console.error("POST /api/ask failed:", error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
