import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { getResults } from "@/lib/services";

/**
 * GET /api/history/[id] — SearchQuery.getResults():
 * returns one saved query with its ranked SearchResult rows + hadith data.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const session = await readSession(request);
    // SearchQuery.getResults()
    const row = await getResults(id);

    if (!row) {
      return NextResponse.json({ success: false, error: "History entry not found." }, { status: 404 });
    }
    if (
      row.userId &&
      session.user &&
      row.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("GET /api/history/[id] failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
