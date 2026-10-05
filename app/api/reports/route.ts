import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseReportBody } from "@/lib/validations/ask";

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
    const saved = await prisma.report.create({
      data: {
        hadithId: parsed.hadithId,
        reason: parsed.reason,
        details: parsed.details,
        queryId: parsed.queryId,
        userId: parsed.userId,
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reports failed:", error);
    return NextResponse.json({ success: false, error: "Could not save report." }, { status: 500 });
  }
}
