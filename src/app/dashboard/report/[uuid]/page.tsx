"use client";

import { useEffect, useState } from "react";
import { PageScanReportWithCorrections } from "@/db/schema";
import React from "react";
import ReportV2 from "@/components/report-v2";
type Props = {
  params: Promise<{
    uuid: string;
  }>;
};

export default function ReportPage({ params }: Props) {
  const resolvedParams = React.use(params);
  const [pageScanReport, setPageScanReport] =
    useState<PageScanReportWithCorrections | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/report/${resolvedParams.uuid}`);
        if (!response.ok) {
          throw new Error("Failed to fetch scan");
        }
        const data = await response.json();
        setPageScanReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [resolvedParams.uuid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading report...
        </div>
      </div>
    );
  }

  if (!pageScanReport || error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-8 border border-gray-200 rounded-lg overflow-hidden font-sans mt-10">
          <div className="p-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Report Not Found
            </h1>
            <p className="text-gray-600">
              The report you are looking for does not exist or you do not have
              permission to view it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="mx-auto px-4">
        <div className="flex gap-6">
          {/* Main Report Column */}
          <div className="flex-1">
            <ReportV2 fullReport={pageScanReport} />
          </div>
        </div>
      </div>
    </div>
  );
}
