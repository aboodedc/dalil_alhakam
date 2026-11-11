import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isManagerOrAdmin, readSession } from "@/lib/auth/session";
import { findByTitle, submitSourceRequest } from "@/lib/services";

/**
 * Source request sequence:
 *   POST /api/sources (title, edition) → findByTitle →
 *     [bookExists] 409 source already available
 *     [bookNotFound] create(userId, title, edition) → 201 Created, status = PENDING
 *   GET  /api/sources → own requests (ADMIN/MANAGER can pass ?all=true)
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const edition = typeof body.edition === "string" ? body.edition.trim().slice(0, 200) : "";
  if (!title) {
    return NextResponse.json({ success: false, error: "title is required." }, { status: 400 });
  }

  try {
    const session = await readSession(request);
    const userId = session.user?.id ?? null;

    // Sequence: findByTitle(title) → book / null
    const book = await findByTitle(title);
    if (book) {
      return NextResponse.json(
        { success: false, error: "source already available", bookId: book.id },
        { status: 409 },
      );
    }

    // SourceRequest.submit(userId, title, edition) → status = PENDING
    const sourceRequest = await submitSourceRequest({
      userId,
      title,
      edition: edition || null,
    });
    return NextResponse.json({ success: true, data: sourceRequest }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sources failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  try {
    const session = await readSession(request);
    if (!session.user) {
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }
    if (all && !isManagerOrAdmin(session.user)) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const rows = await prisma.sourceRequest.findMany({
      where: all ? undefined : { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        edition: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        user: { select: { email: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /api/sources failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
