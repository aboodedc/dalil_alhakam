import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/health — DB connectivity + provider configuration check (no secrets leaked). */
export async function GET() {
  const checks: Record<string, boolean | string> = {
    embedding: Boolean(process.env.EMBEDDING_API_KEY ?? process.env.SILICONFLOW_API_KEY),
    reranker: Boolean(process.env.RERANKER_API_KEY ?? process.env.SILICONFLOW_API_KEY),
    llm: Boolean(process.env.LLM_API_KEY),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
    const [books, hadiths, embedded] = await Promise.all([
      prisma.book.count(),
      prisma.hadith.count({ where: { isHadith: true } }),
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "Hadith" WHERE embedding IS NOT NULL`,
    ]);
    return NextResponse.json({
      success: true,
      data: {
        status: "ok",
        database: "up",
        books,
        hadiths,
        embedded: Number(embedded[0]?.count ?? 0),
        providers: {
          embedding: checks.embedding ? "configured" : "missing",
          reranker: checks.reranker ? "configured" : "missing",
          llm: checks.llm ? "configured" : "missing",
        },
        pipeline: {
          recallK: Number(process.env.RAG_RECALL_K ?? 30),
          finalK: Number(process.env.RAG_FINAL_K ?? 10),
          minScore: Number(process.env.RAG_MIN_SCORE ?? 0.3),
          rewrite: (process.env.QUERY_REWRITE_ENABLED ?? "true").toLowerCase() !== "false",
        },
      },
    });
  } catch (error) {
    console.error("GET /api/health DB check failed:", error);
    return NextResponse.json(
      {
        success: false,
        data: {
          status: "degraded",
          database: "down",
          providers: {
            embedding: checks.embedding ? "configured" : "missing",
            reranker: checks.reranker ? "configured" : "missing",
            llm: checks.llm ? "configured" : "missing",
          },
        },
        error: "Database unreachable. Run `npm run db:up` then `npm run db:migrate`.",
      },
      { status: 503 },
    );
  }
}
