import { db } from "@/db";
import {
  pageScanReportTable,
  pageScanReportCorrectionsTable,
} from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const scans = await db
      .select({
        id: pageScanReportTable.id,
        uuid: pageScanReportTable.uuid,
        url: pageScanReportTable.url,
        state: pageScanReportTable.state,
        state_internal: pageScanReportTable.state_internal,
        run_start_time: pageScanReportTable.run_start_time,
        run_end_time: pageScanReportTable.run_end_time,
        critical_corrections_count: sql`SUM(CASE WHEN ${pageScanReportCorrectionsTable.severity} = 'critical' THEN 1 ELSE 0 END)`,
        important_corrections_count: sql`SUM(CASE WHEN ${pageScanReportCorrectionsTable.severity} = 'important' THEN 1 ELSE 0 END)`,
        minor_corrections_count: sql`SUM(CASE WHEN ${pageScanReportCorrectionsTable.severity} = 'minor' THEN 1 ELSE 0 END)`,
      })
      .from(pageScanReportTable)
      .leftJoin(
        pageScanReportCorrectionsTable,
        eq(
          pageScanReportTable.id,
          pageScanReportCorrectionsTable.page_scan_report_id,
        ),
      )
      .groupBy(
        pageScanReportTable.id,
        pageScanReportTable.uuid,
        pageScanReportTable.url,
        pageScanReportTable.state,
        pageScanReportTable.state_internal,
        pageScanReportTable.run_start_time,
        pageScanReportTable.run_end_time,
      )
      .orderBy(desc(pageScanReportTable.run_start_time));

    return NextResponse.json({
      scans,
    });
  } catch (error) {
    console.error("Error fetching spell check runs:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
