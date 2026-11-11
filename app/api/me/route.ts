import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";

/** GET /api/me — current session user (used by the header / manager gate). */
export async function GET(request: NextRequest) {
  try {
    const session = await readSession(request);
    if (!session.user) {
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: session.user });
  } catch (error) {
    console.error("GET /api/me failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
