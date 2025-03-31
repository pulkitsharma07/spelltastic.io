import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { pageScanReportTable } from "./schema";
import { PageScanReportWithCorrections } from "@/db/schema";

export const fetchFullPageScanReport = async (
  uuid: string,
  public_report: boolean = false,
): Promise<PageScanReportWithCorrections | null> => {
  const where = public_report
    ? and(eq(pageScanReportTable.uuid, uuid))
    : and(eq(pageScanReportTable.uuid, uuid));

  const fullReport = await db.query.pageScanReportTable.findFirst({
    where: where,
    with: {
      pageScanReportCorrections: true,
    },
  });

  if (!fullReport) {
    return null;
  }

  return fullReport;
};
