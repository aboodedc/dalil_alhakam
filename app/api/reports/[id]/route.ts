import { NextRequest, NextResponse } from "next/server";
import { isManagerOrAdmin, readSession } from "@/lib/auth/session";
import { dismissReport, resolveReport } from "@/lib/services";

/**
 * PATCH /api/reports/[id] — Report.resolve() / Report.dismiss().
 * Manager/Admin only.
 */
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

  if (body.status !== "RESOLVED" && body.status !== "DISMISSED") {
    return NextResponse.json(
      { success: false, error: "status must be RESOLVED or DISMISSED." },
      { status: 400 },
    );
  }

  try {
    const session = await readSession(request);
    if (!isManagerOrAdmin(session.user)) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }
    const updated =
      body.status === "RESOLVED" ? await resolveReport(id) : await dismissReport(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/reports/[id] failed:", error);
    return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
  }
}
