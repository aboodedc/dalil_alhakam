import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin, readSession } from "@/lib/auth/session";

/**
 * DELETE /api/accounts/[id] — Manage Accounts sequence:
 * checkRole(ADMIN) → delete() → 200 OK.
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const session = await readSession(request);
    if (!isAdmin(session.user)) {
      return NextResponse.json({ success: false, error: "Forbidden — ADMIN role required." }, { status: 403 });
    }
    if (session.user?.id === id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 },
      );
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] failed:", error);
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }
}
