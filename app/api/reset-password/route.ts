import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

/**
 * POST /api/reset-password — Reset Password sequence, part 2:
 * getUserByResetToken → 400 invalid/expired OR hashPassword → updatePassword → 200 OK.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!token || !newPassword) {
    return NextResponse.json(
      { success: false, error: "token and newPassword are required." },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    // Sequence: alt [user == null || tokenInvalidOrExpired] → 400 link is invalid or expired
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: "link is invalid or expired" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Sequence: 200 OK
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/reset-password failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
