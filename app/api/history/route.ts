import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/history — recent search runs (SRS §6.3). `?userId=` optional, `?limit=` default 20. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  try {
    const rows = await prisma.searchQuery.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        question: true,
        bookId: true,
        latencyMs: true,
        createdAt: true,
        _count: { select: { results: true } },
      },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /api/history failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
