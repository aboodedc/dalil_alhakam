import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

/** POST /api/logout — clears the session cookie. */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
