import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin, readSession } from "@/lib/auth/session";

/**
 * PATCH /api/accounts/role — Manage Accounts sequence:
 * checkRole(ADMIN) → setRole(role) → 200 OK, updatedUser.
 */
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const role = body.role;
  if (!userId) {
    return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 });
  }
  if (role !== "USER" && role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "role must be USER, MANAGER or ADMIN." },
      { status: 400 },
    );
  }

  try {
    const session = await readSession(request);
    if (!isAdmin(session.user)) {
      return NextResponse.json({ success: false, error: "Forbidden — ADMIN role required." }, { status: 403 });
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, totpEnabled: true },
    });
    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("PATCH /api/accounts/role failed:", error);
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }
}
