import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendResetLink } from "@/lib/email";

/**
 * POST /api/reset-request — Reset Password sequence, part 1:
 * getUserByEmail → (if exists) createResetToken → saveResetToken → sendResetLink.
 * Always returns 200 OK to avoid account enumeration.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ success: false, error: "email is required." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    let devResetLink: string | undefined;
    if (user) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const origin = new URL(request.url).origin;
      const link = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await sendResetLink(user.email, link);

      if (process.env.EMAIL_DEBUG === "true" || process.env.NODE_ENV !== "production") {
        devResetLink = link;
      }
    }

    // Sequence: 200 OK (regardless of whether the email exists)
    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        ...(devResetLink ? { devResetLink } : {}),
      },
    });
  } catch (error) {
    console.error("POST /api/reset-request failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
