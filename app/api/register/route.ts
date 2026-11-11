import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth/token";
import { setSessionCookie } from "@/lib/auth/session";
import { register } from "@/lib/services";

/** POST /api/register — Register sequence: email check → hashPassword → create → 201 Created + token. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) {
    return NextResponse.json({ success: false, error: "name is required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    // Sequence: getUserByEmail → alt [emailExists] → 409 email already registered
    // User.register(): hashPassword → create(name, email, passwordHash)
    const result = await register({ name, email, password });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 409 });
    }

    const user = result.user;
    const token = createToken({ id: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);

    // Sequence: 201 Created + token
    return NextResponse.json({ success: true, data: { token, user } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/register failed:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "email already registered" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
