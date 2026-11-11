import type { NextRequest } from "next/server";
import { POST as createReport } from "../reports/route";

/**
 * POST /api/report — endpoint name used by the Make Report sequence.
 * Kept as an alias of /api/reports so both clients stay compatible.
 */
export async function POST(request: NextRequest) {
  return createReport(request);
}
