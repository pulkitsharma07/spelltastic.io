import { getSeverityLabel } from "@/lib/utils";
import { computeTextDiff, TextDiff } from "@/lib/diff";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageScanReportWithCorrections } from "@/db/schema";
import DebuggingInfo from "@/components/report/debugging-info";

interface ReportV2Props {
  fullReport: PageScanReportWithCorrections;
}

export function getCardStyles(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 hover:bg-red-500/20 border border-red-400/20";
    case "important":
      return "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20";
    case "minor":
      return "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20";
    default:
      return "bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50";
  }
}

interface DiffDisplayProps {
  changes: TextDiff[];
  type: "delete" | "insert";
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

function DiffDisplay({
  changes,
  type,
  label,
  icon,
  colorClass,
}: DiffDisplayProps) {
  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 text-xs font-mono ${colorClass} mb-1`}
      >
        {icon}
        {label}
      </div>
      <div className="pl-6 font-medium whitespace-pre-wrap text-lg">
        {changes.map((change, idx) => (
          <span
            key={idx}
            className={
              change.type === type
                ? `${
                    type === "delete"
                      ? "bg-red-900/80 text-red-300 px-1 rounded"
                      : "bg-green-900/80 text-green-300 px-1 rounded"
                  }`
                : change.type === "equal"
                  ? "text-slate-300"
                  : "hidden"
            }
          >
            {change.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReportV2({ fullReport }: ReportV2Props) {
  const corrections = fullReport.pageScanReportCorrections;
  const criticalCount = corrections.filter(
    (c) => c.severity === "critical",
  ).length;
  const importantCount = corrections.filter(
    (c) => c.severity === "important",
  ).length;
  const minorCount = corrections.filter((c) => c.severity === "minor").length;

  const severityOrder = {
    critical: 3,
    important: 2,
    minor: 1,
  };

  // Sort corrections by severity (critical first)
  const sortedCorrections = [...corrections].sort(
    (a, b) =>
      (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
      (severityOrder[a.severity as keyof typeof severityOrder] || 0),
  );

  return (
    <div className="space-y-8">
      <div
        id="spelltastic-report"
        className="space-y-8 rounded-lg p-8 bg-slate-800/50 backdrop-blur-sm border-slate-700/50"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex flex-row justify-center items-center gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Content Quality Report
            </h1>
          </div>
          <p className="text-slate-300">
            Generated for{" "}
            <a
              href={fullReport.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              {fullReport.url.length > 50
                ? `${fullReport.url.substring(0, 47)}...`
                : fullReport.url}
            </a>
          </p>
          <p className="text-sm text-slate-400">
            {new Date(fullReport.run_start_time).toLocaleString(undefined, {
              hour12: true,
              hour: "numeric",
              minute: "numeric",
              month: "numeric",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {corrections.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">👍</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Congratulations!
            </h2>
            <p className="text-lg text-slate-300">
              We could not find any issues on this page. Keep up the great work!
              <br />
              You can try checking another page.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-slate-800/80 rounded-lg border border-slate-600/50 p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-center bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Summary of Findings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-400/20 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-red-400 mb-1">
                    {criticalCount}
                  </div>
                  <div className="text-sm text-red-300">
                    Critical {criticalCount === 1 ? "Issue" : "Issues"}
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-amber-500/10 border border-amber-400/20 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-amber-400 mb-1">
                    {importantCount}
                  </div>
                  <div className="text-sm text-amber-300">
                    Important {importantCount === 1 ? "Issue" : "Issues"}
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-400/20 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-blue-400 mb-1">
                    {minorCount}
                  </div>
                  <div className="text-sm text-blue-300">
                    Minor {minorCount === 1 ? "Issue" : "Issues"}
                  </div>
                </div>
              </div>
            </div>

            {/* Corrections List */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">
                Detailed Findings
              </h2>
              {sortedCorrections.map((correction, index) => (
                <div
                  key={correction.id}
                  className={`${getCardStyles(
                    correction.severity,
                  )} p-2 rounded-lg shadow-lg`}
                >
                  {/* Correction Header */}
                  <div
                    className={`flex items-center justify-between mb-4 p-3 rounded-lg ${
                      correction.severity === "critical"
                        ? "bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-400/5 border border-red-400/20"
                        : correction.severity === "important"
                          ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-400/5 border border-amber-400/20"
                          : "bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-blue-400/5 border border-blue-400/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          correction.severity === "critical"
                            ? "text-red-400"
                            : correction.severity === "important"
                              ? "text-amber-400"
                              : "text-blue-400"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
                          correction.severity === "critical"
                            ? "bg-red-900/80 text-red-300 shadow-sm shadow-red-900/50"
                            : correction.severity === "important"
                              ? "bg-amber-900/80 text-amber-300 shadow-sm shadow-amber-900/50"
                              : "bg-blue-900/80 text-blue-300 shadow-sm shadow-blue-900/50"
                        }`}
                      >
                        {getSeverityLabel(correction.severity)}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm ${
                        correction.severity === "critical"
                          ? "bg-red-900/50 text-red-300"
                          : correction.severity === "important"
                            ? "bg-amber-900/50 text-amber-300"
                            : "bg-blue-900/50 text-blue-300"
                      }`}
                    >
                      {correction.issue_type}
                    </span>
                  </div>

                  {/* Correction Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Text Content - Left Side */}
                    <div className="space-y-4 overflow-y-auto pr-4">
                      <div>
                        <div className="font-mono text-sm rounded-lg border border-slate-700/50 overflow-hidden">
                          {/* Header */}
                          <div className="bg-slate-800/80 border-b border-slate-700/50 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-slate-300">
                                Text Changes
                              </span>
                            </div>
                          </div>
                          {/* Diff Content */}
                          <div className="p-4 space-y-3 bg-slate-900/90 backdrop-blur-sm">
                            {(() => {
                              const changes = computeTextDiff(
                                correction.original_text,
                                correction.corrected_text,
                              );
                              return (
                                <>
                                  <DiffDisplay
                                    changes={changes}
                                    type="delete"
                                    label="Current Text"
                                    icon={
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                    }
                                    colorClass="text-red-400"
                                  />
                                  <DiffDisplay
                                    changes={changes}
                                    type="insert"
                                    label="Suggested Improvement"
                                    icon={
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                    }
                                    colorClass="text-green-400"
                                  />
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="space-y-4 mt-4">
                          <div className="flex items-start gap-3 p-4 bg-purple-900/70 rounded-lg border border-purple-400/20">
                            <svg
                              className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div className="space-y-1">
                              <h4 className="font-medium text-blue-300">
                                Why This Matters
                              </h4>
                              <p className="text-sm text-blue-200">
                                {correction.explanation_for_correction}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image - Right Side */}
                    <div className="flex items-center justify-center h-full bg-slate-800/80 rounded-lg overflow-hidden shadow-lg border border-slate-600/50 backdrop-blur-sm">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="w-full h-full group relative">
                            <img
                              src={`/api/screenshots/${correction.uuid}`}
                              alt={`Screenshot showing ${correction.original_text}`}
                              className="w-full h-full object-cover transition-all group-hover:opacity-90 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-all flex items-center justify-center">
                              <div className="bg-slate-800 px-4 py-2 rounded-full text-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-700/50">
                                Click to view full context
                              </div>
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent
                          className="max-w-4xl w-[90vw] bg-slate-900/95 border-slate-600/50 backdrop-blur-sm"
                          aria-describedby={`Screenshot showing ${correction.original_text}`}
                        >
                          <DialogHeader>
                            <DialogTitle className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                              Visual Context
                            </DialogTitle>
                          </DialogHeader>
                          <div className="relative aspect-video bg-slate-800/80 rounded-lg border border-slate-600/50 overflow-hidden backdrop-blur-sm">
                            <img
                              src={`/api/screenshots/${correction.uuid}`}
                              alt={`Screenshot showing ${correction.original_text}`}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                          </div>
                          <div className="space-y-4 mt-4">
                            <div className="flex items-start gap-3 p-4 bg-purple-900/70 rounded-lg border border-purple-400/20">
                              <svg
                                className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <div className="space-y-1">
                                <h4 className="font-medium text-blue-300">
                                  Why This Matters
                                </h4>
                                <p className="text-sm text-blue-200">
                                  {correction.explanation_for_correction}
                                </p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-700/50">
          Generated by Spelltastic.io (Open-Core) •{" "}
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Add DebuggingInfo component */}
      <DebuggingInfo reportUuid={fullReport.uuid} />
    </div>
  );
}
