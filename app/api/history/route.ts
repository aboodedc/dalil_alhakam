import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/session";

/**
 * GET /api/history?userId=&limit= — View History sequence:
 * getHistory(userId) → findMany(userId) → 200 OK, sq: searchQuery[].
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const includeResults = searchParams.get("includeResults") === "true";

  try {
    const session = await readSession(request);
    const userId = session.user?.id ?? searchParams.get("userId") ?? undefined;

    const rows = await prisma.searchQuery.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        question: true,
        answer: true,
        bookId: true,
        latencyMs: true,
        createdAt: true,
        _count: { select: { results: true } },
        ...(includeResults
          ? {
              results: {
                orderBy: { rank: "asc" as const },
                select: {
                  rank: true,
                  cosineScore: true,
                  rerankScore: true,
                  summary: true,
                  hadith: {
                    select: {
                      id: true,
                      text: true,
                      hadithNumber: true,
                      volume: true,
                      page: true,
                      book: { select: { title: true, slug: true } },
                    },
                  },
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /api/history failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
