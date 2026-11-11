import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth/token";
import { setSessionCookie } from "@/lib/auth/session";
import { login } from "@/lib/services";

/** POST /api/login — Login sequence: getUserByEmail → comparePassword → createToken → 200 OK + token. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "email and password are required." },
      { status: 400 },
    );
  }

  try {
    // User.login(): getUserByEmail → comparePassword
    const user = await login({ email, password });
    if (!user) {
      // Sequence: alt [userNotFound or NotMatchPassword] → 401 password or email wrong
      return NextResponse.json(
        { success: false, error: "password or email wrong" },
        { status: 401 },
      );
    }

    const token = createToken({ id: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);

    // Sequence: 200 OK + token
    return NextResponse.json({ success: true, data: { token, user } });
  } catch (error) {
    console.error("POST /api/login failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
