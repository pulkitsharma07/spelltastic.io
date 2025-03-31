"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DebuggingInfoProps {
  reportUuid: string;
}

interface DebugInfo {
  report_id: number;
  report_uuid: string;
  created_by: string;
  run_start_time: string;
  run_end_time: string | null;
  state: string;
  state_internal: string;
  visibility: string;
  generate_corrections_model?: string;
  validator_model?: string;
  [key: string]: unknown;
}

export default function DebuggingInfo({ reportUuid }: DebuggingInfoProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        const response = await fetch(
          `/api/report/${reportUuid}/debugging-info?superUser=true`,
        );
        if (!response.ok) {
          if (response.status === 401) {
            // Not a superuser, silently fail
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch debugging info");
        }
        const data = await response.json();
        setDebugInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    const isSuperUser = document.cookie.includes("__SUPERUSER");
    if (isSuperUser) {
      fetchDebugInfo();
    }
  }, [reportUuid]);

  if (loading) return null;
  if (error) return null;
  if (!debugInfo) return null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Debugging Information</CardTitle>
        <CardDescription>Technical details about this report</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-500">Basic Info</h3>
              <div className="space-y-1">
                <InfoRow label="Report ID" value={debugInfo.report_id} />
                <InfoRow label="Report UUID" value={debugInfo.report_uuid} />
                <InfoRow label="Created By" value={debugInfo.created_by} />
                <InfoRow label="Visibility" value={debugInfo.visibility} />
              </div>
            </div>

            {/* Timing Info */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-500">Timing</h3>
              <div className="space-y-1">
                <InfoRow
                  label="Start Time"
                  value={new Date(debugInfo.run_start_time).toLocaleString()}
                />
                {debugInfo.run_end_time && (
                  <InfoRow
                    label="End Time"
                    value={new Date(debugInfo.run_end_time).toLocaleString()}
                  />
                )}
                {debugInfo.run_start_time && debugInfo.run_end_time && (
                  <InfoRow
                    label="Duration"
                    value={`${Math.round(
                      (new Date(debugInfo.run_end_time).getTime() -
                        new Date(debugInfo.run_start_time).getTime()) /
                        1000,
                    )}s`}
                  />
                )}
              </div>
            </div>

            {/* State Info */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-500">State</h3>
              <div className="space-y-1">
                <InfoRow label="State" value={debugInfo.state} />
                <InfoRow
                  label="Internal State"
                  value={debugInfo.state_internal}
                />
              </div>
            </div>

            {/* Model Info */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-500">Models</h3>
              <div className="space-y-1">
                <InfoRow
                  label="Corrections Model"
                  value={debugInfo.generate_corrections_model || "N/A"}
                />
                <InfoRow
                  label="Validator Model"
                  value={debugInfo.validator_model || "N/A"}
                />
              </div>
            </div>
          </div>

          {/* Raw Debug Info */}
          <div className="mt-4">
            <h3 className="font-medium text-sm text-gray-500 mb-2">
              Raw Debug Info
            </h3>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="font-mono">{String(value)}</span>
    </div>
  );
}
