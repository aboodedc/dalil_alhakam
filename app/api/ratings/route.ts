import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseRatingBody } from "@/lib/validations/ask";

/** POST /api/ratings — 5-star relevance rating on a result (SRS §6). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = parseRatingBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  try {
    const saved = await prisma.rating.create({
      data: {
        hadithId: parsed.hadithId,
        stars: parsed.stars,
        queryId: parsed.queryId,
        userId: parsed.userId,
        comment: parsed.comment,
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/ratings failed:", error);
    return NextResponse.json({ success: false, error: "Could not save rating." }, { status: 500 });
  }
}
