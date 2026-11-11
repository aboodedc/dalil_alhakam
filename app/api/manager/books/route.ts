import { NextRequest, NextResponse } from "next/server";
import { isManagerOrAdmin, readSession } from "@/lib/auth/session";
import { setBookStatus } from "@/lib/services";

/**
 * PATCH /api/manager/books — manager scope = books only (TASK-008):
 * {bookId (id or slug), status?: "ACTIVE"|"SUSPENDED", edition?: string}
 */
export async function PATCH(request: NextRequest) {
  // Modify Sources sequence: checkRole(ADMIN, MANAGER)
  const session = await readSession(request);
  if (!isManagerOrAdmin(session.user)) {
    return NextResponse.json(
      { success: false, error: "Forbidden — ADMIN or MANAGER role required." },
      { status: 403 },
    );
  }

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
    // Book.setBookStatus()
    const updated = await setBookStatus(body.bookId, data);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Unknown book" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/manager/books failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}
