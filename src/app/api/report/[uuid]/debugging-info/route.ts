import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pageScanReportTable } from "@/db/schema";
import { eq } from "drizzle-orm";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const isSuperUser = request.nextUrl.searchParams.get("superUser") === "true";

  if (!isSuperUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const report = await db.query.pageScanReportTable.findFirst({
    where: eq(pageScanReportTable.uuid, (await params).uuid),
  });

  if (!report) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const debuggingInfo = {
    ...((report.debugging_info as Record<string, unknown>) || {}),
    report_id: report.id,
    report_uuid: report.uuid,
    run_start_time: report.run_start_time,
    run_end_time: report.run_end_time,
    state: report.state,
    state_internal: report.state_internal,
  };

  return NextResponse.json(debuggingInfo);
}
