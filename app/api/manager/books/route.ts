import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/manager/books — manager scope = books only (TASK-008):
 * {bookId (id or slug), status?: "ACTIVE"|"SUSPENDED", edition?: string}
 */
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.bookId !== "string" || !body.bookId) {
    return NextResponse.json({ success: false, error: "bookId is required." }, { status: 400 });
  }

  const data: { status?: "ACTIVE" | "SUSPENDED"; edition?: string } = {};
  if (body.status === "ACTIVE" || body.status === "SUSPENDED") data.status = body.status;
  if (typeof body.edition === "string" && body.edition.trim()) {
    data.edition = body.edition.trim().slice(0, 200);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, error: "Nothing to update (status and/or edition required)." },
      { status: 400 },
    );
  }

  try {
    const book = await prisma.book.findFirst({
      where: { OR: [{ id: body.bookId }, { slug: body.bookId }] },
      select: { id: true },
    });
    if (!book) {
      return NextResponse.json({ success: false, error: "Unknown book." }, { status: 404 });
    }
    const updated = await prisma.book.update({
      where: { id: book.id },
      data,
      select: { id: true, slug: true, status: true, edition: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/manager/books failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
