import { NextRequest, NextResponse } from "next/server";
import { parseRatingBody } from "@/lib/validations/ask";
import { readSession } from "@/lib/auth/session";
import { rateHadith } from "@/lib/services";

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
    const session = await readSession(request);
    // User.rateHadith() / Rating.submit()
    const saved = await rateHadith({
      ...parsed,
      userId: session.user?.id ?? parsed.userId,
    });
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error("POST /api/ratings failed:", error);
    return NextResponse.json({ success: false, error: "Could not save rating." }, { status: 500 });
  }
}
