import { NextRequest, NextResponse } from "next/server";
import { isManagerOrAdmin, readSession } from "@/lib/auth/session";
import { reviewSourceRequest } from "@/lib/services";

/** PATCH /api/sources/[id] — manager/admin approve or reject a source request. */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.status !== "APPROVED" && body.status !== "REJECTED" && body.status !== "PENDING") {
    return NextResponse.json(
      { success: false, error: "status must be PENDING, APPROVED or REJECTED." },
      { status: 400 },
    );
  }

  try {
    const session = await readSession(request);
    if (!isManagerOrAdmin(session.user)) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }
    // SourceRequest.resolve() / dismiss()
    const updated = await reviewSourceRequest(id, body.status);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/sources/[id] failed:", error);
    return NextResponse.json({ success: false, error: "Source request not found." }, { status: 404 });
  }
}
