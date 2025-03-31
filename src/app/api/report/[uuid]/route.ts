import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { pageScanReportTable } from "@/db/schema";
import { fetchFullPageScanReport } from "@/db/fetcher";

type Props = {
  params: Promise<{
    uuid: string;
  }>;
};
export async function DELETE(request: NextRequest, { params }: Props) {
  const { uuid } = await params;

  try {
    // First verify the spell check run exists and belongs to user
    const spellCheckRun = await db
      .select()
      .from(pageScanReportTable)
      .where(and(eq(pageScanReportTable.uuid, uuid)))
      .limit(1);

    if (!spellCheckRun || spellCheckRun.length === 0) {
      return new NextResponse("Report not found", { status: 404 });
    }

    // Then delete the spell check run
    await db
      .delete(pageScanReportTable)
      .where(eq(pageScanReportTable.id, spellCheckRun[0].id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  const { uuid } = await params;

  try {
    // Fetch the spell check run
    const pageScanReport = await db
      .select()
      .from(pageScanReportTable)
      .where(and(eq(pageScanReportTable.uuid, uuid)))
      .limit(1);

    if (!pageScanReport || pageScanReport.length === 0) {
      console.error("Report not found");
      return new NextResponse("Report not found", { status: 404 });
    }

    const fullScanReport = await fetchFullPageScanReport(uuid);

    if (!fullScanReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(fullScanReport);
  } catch (error) {
    console.error("Error fetching report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
