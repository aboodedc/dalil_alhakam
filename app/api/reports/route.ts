import { NextRequest, NextResponse } from "next/server";
import { parseReportBody } from "@/lib/validations/ask";
import { isManagerOrAdmin, readSession } from "@/lib/auth/session";
import { getReports, reportHadith } from "@/lib/services";

/** GET /api/reports — manager/admin review list. */
export async function GET(request: NextRequest) {
  try {
    const session = await readSession(request);
    if (!isManagerOrAdmin(session.user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden — ADMIN or MANAGER role required." },
        { status: 403 },
      );
    }
    const rows = await getReports();
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET /api/reports failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}

/** POST /api/reports — report a wrong citation / hukm / scan (SRS §6.2). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = parseReportBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  try {
    const session = await readSession(request);
    // User.reportHadith() / Report.submit()
    const saved = await reportHadith({
      ...parsed,
      userId: session.user?.id ?? parsed.userId,
    });
    if (!saved) {
      return NextResponse.json({ success: false, error: "Hadith not found" }, { status: 404 });
    }
    // Make Report sequence: 200 OK, rp: reportInfo with reportId
    return NextResponse.json({ success: true, data: { ...saved, reportId: saved.id } });
  } catch (error) {
    console.error("POST /api/reports failed:", error);
    return NextResponse.json({ success: false, error: "Could not save report." }, { status: 500 });
  }
}
