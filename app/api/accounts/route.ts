import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin, readSession } from "@/lib/auth/session";

/** GET /api/accounts — Manage Accounts list (ADMIN only). */
export async function GET(request: NextRequest) {
  try {
    const session = await readSession(request);
    if (!isAdmin(session.user)) {
      return NextResponse.json({ success: false, error: "Forbidden — ADMIN role required." }, { status: 403 });
    }
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        totpEnabled: true,
        createdAt: true,
        _count: { select: { queries: true, folders: true } },
      },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /api/accounts failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
