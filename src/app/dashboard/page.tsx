"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UUIDDisplay from "@/components/uuid-display";
import StatusBadge from "@/components/status-badge";
import CreateNewRun from "@/components/create-new-run";
import { DASHBOARD_NEW_SCANS_POLLING_INTERVAL_MS } from "@/constants";
import { SpellCheckRunWithCorrectionCounts } from "@/types/corrections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WelcomeDialog = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl shadow-xl shadow-cyan-500/10 p-8 max-w-lg mx-4 relative border border-slate-700/50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-300 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="text-center mb-6">
          <div className="bg-blue-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2">
            Welcome to Spelltastic Dashboard! 🎉
          </h2>
          <p className="text-slate-300 mb-4">Thank you for signing up!</p>
        </div>
        <div className="space-y-4 text-slate-300">
          <p>As a beta user, you get:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <span className="font-semibold text-blue-400">5 free scans</span>{" "}
              to start with
            </li>
            <li>
              After you run out of scans, your account will be automatically
              refilled with{" "}
              <span className="font-semibold text-blue-400">
                1 free scan every 30 days
              </span>
            </li>
          </ul>
          <p className="text-sm">
            <Link
              href="/pricing#faq-free-beta"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Learn more about our pricing and free scan policy →
            </Link>
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white px-6 py-2.5 rounded-lg font-medium hover:from-blue-600 hover:via-cyan-600 hover:to-teal-600 transition-all shadow-lg shadow-cyan-500/20"
        >
          Got it, let's get started!
        </button>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [scans, setScans] = useState<SpellCheckRunWithCorrectionCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [urlToRecheck, setUrlToRecheck] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScans() {
      try {
        const response = await fetch("/api/get-scans");
        if (!response.ok) {
          throw new Error("Failed to get new scans");
        }
        const data = await response.json();
        setScans(data.scans);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchScans();
    const intervalId = setInterval(
      fetchScans,
      DASHBOARD_NEW_SCANS_POLLING_INTERVAL_MS,
    );

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // In case the user signs out while on the page.
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
          Loading...
        </div>
      </div>
    );
  }

  // Group spell check runs by URL
  const groupedRuns = scans.reduce(
    (groups, run) => {
      const url = run.url;
      if (!groups[url]) {
        groups[url] = [];
      }
      groups[url].push(run);
      return groups;
    },
    {} as Record<string, SpellCheckRunWithCorrectionCounts[]>,
  );

  // Sort URLs by most recent run
  const sortedUrls = Object.keys(groupedRuns).sort((a, b) => {
    const latestA = new Date(groupedRuns[a][0].run_start_time).getTime();
    const latestB = new Date(groupedRuns[b][0].run_start_time).getTime();
    return latestB - latestA;
  });

  const handleDelete = async (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(`/api/report/${uuid}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete report");

      // Remove from state
      setScans((runs) => runs.filter((run) => run.uuid !== uuid));
    } catch {
      alert("Failed to delete report");
    }
  };

  if (error) {
    return (
      <div className="text-red-600 p-4 rounded-md bg-red-50 border border-red-200">
        Error: {error}
      </div>
    );
  }

  return (
    <>
      {showWelcome && <WelcomeDialog onClose={() => setShowWelcome(false)} />}
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-2 space-y-8">
          {/* Create New Scan Button */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardContent>
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
                <CardContent className="pt-6">
                  <CreateNewRun
                    initialUrl={urlToRecheck || ""}
                    autoSubmit={true}
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Scan History */}
          {scans.length === 0 ? (
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-12 w-12 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-100 mb-1">
                    No scans yet
                  </h3>
                  <p className="text-slate-400">
                    Create your first scan to get started!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Scan History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {sortedUrls.map((url) => (
                    <div
                      key={url}
                      className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 rounded-lg overflow-hidden border border-slate-600/50 backdrop-blur-sm shadow-xl"
                    >
                      <div className="px-6 py-4 bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border-b border-slate-600/50 flex justify-between items-center backdrop-blur-sm">
                        <h2 className="text-lg font-semibold text-slate-100">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 hover:underline transition-colors"
                          >
                            {url.length > 50
                              ? `${url.substring(0, 47)}...`
                              : url}
                          </a>
                        </h2>
                        <button
                          onClick={() => {
                            setUrlToRecheck(url);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 text-blue-300 hover:text-blue-200 border border-blue-400/20 hover:border-blue-300/30 rounded-lg transition-all flex items-center gap-2 hover:shadow-md hover:shadow-blue-500/10"
                        >
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
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Rescan
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700/50">
                          <thead>
                            <tr className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90">
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Issues Found
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Report ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {groupedRuns[url]
                              .sort(
                                (a, b) =>
                                  new Date(b.run_start_time).getTime() -
                                  new Date(a.run_start_time).getTime(),
                              )
                              .map((run) => (
                                <tr
                                  key={run.id}
                                  onClick={() =>
                                    run.state === "completed" &&
                                    router.push(`/dashboard/report/${run.uuid}`)
                                  }
                                  className={
                                    run.state === "completed"
                                      ? "hover:bg-slate-700/50 cursor-pointer text-slate-200 transition-all backdrop-blur-sm hover:shadow-md"
                                      : "hover:bg-slate-700/50 text-slate-200 transition-all backdrop-blur-sm hover:shadow-md"
                                  }
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <StatusBadge state={run.state} />
                                  </td>
                                  <td>
                                    <div className="px-6 py-4 whitespace-nowrap text-sm">
                                      {run.state === "completed" ? (
                                        run.critical_corrections_count === 0 &&
                                        run.important_corrections_count === 0 &&
                                        run.minor_corrections_count === 0 ? (
                                          <div className="text-teal-300 flex items-center gap-1 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-400/20 w-fit">
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
                                                d="M5 13l4 4L19 7"
                                              />
                                            </svg>
                                            No issues found
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-2">
                                            {run.critical_corrections_count >
                                              0 && (
                                              <div className="text-red-300 font-medium bg-gradient-to-r from-red-500/20 to-red-500/10 px-3 py-1 rounded-full border border-red-400/20 shadow-sm shadow-red-500/10">
                                                {run.critical_corrections_count}{" "}
                                                Critical
                                              </div>
                                            )}
                                            {run.important_corrections_count >
                                              0 && (
                                              <div className="text-amber-300 font-medium bg-gradient-to-r from-amber-500/20 to-amber-500/10 px-3 py-1 rounded-full border border-amber-400/20 shadow-sm shadow-amber-500/10">
                                                {
                                                  run.important_corrections_count
                                                }{" "}
                                                Important
                                              </div>
                                            )}
                                            {run.minor_corrections_count >
                                              0 && (
                                              <div className="text-blue-300 font-medium bg-gradient-to-r from-blue-500/20 to-blue-500/10 px-3 py-1 rounded-full border border-blue-400/20 shadow-sm shadow-blue-500/10">
                                                {run.minor_corrections_count}{" "}
                                                Minor
                                              </div>
                                            )}
                                          </div>
                                        )
                                      ) : (
                                        "-"
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {new Date(
                                      run.run_start_time,
                                    ).toLocaleString(undefined, {
                                      hour12: true,
                                      hour: "numeric",
                                      minute: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">
                                    <UUIDDisplay uuid={run.uuid} />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                                    {run.state === "completed" && (
                                      <>
                                        <Link
                                          href={`/dashboard/report/${run.uuid}`}
                                          className="text-blue-300 hover:text-blue-200 font-medium transition-colors hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View
                                        </Link>
                                        <button
                                          onClick={(e) =>
                                            handleDelete(run.uuid, e)
                                          }
                                          className="text-red-300 hover:text-red-200 font-medium transition-colors hover:underline"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
