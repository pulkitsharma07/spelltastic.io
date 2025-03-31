"use client";

import { useState, useEffect } from "react";
import LoadingStateSSE from "./loading-state-sse";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

async function createRun(
  url: string,
  setMessage: (message: string) => void,
): Promise<string> {
  const uuid = uuidv4();

  const apiResponse = await fetch("/api/create-run", {
    method: "POST",
    headers: {
      "Content-Type": "text/event-stream",
    },
    body: JSON.stringify({ url, uuid }),
  });

  if (!apiResponse.ok) {
    switch (apiResponse.status) {
      case 503:
        throw new Error(
          "Sorry, we are under heavy load, please try again later",
        );
      default:
        try {
          let body = "";
          try {
            body = await apiResponse.text();
          } catch {}
          fetch("/api/track/notify", {
            method: "POST",
            body: JSON.stringify({
              message:
                "Failed to create run: Status:" +
                apiResponse.status +
                " " +
                apiResponse.statusText +
                " " +
                body,
            }),
          });
        } catch {}
        throw new Error("Something went wrong, please try again later");
    }
  }

  if (!apiResponse.body) {
    throw new Error("Something went wrong");
  }

  const reader = apiResponse.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  while (true) {
    const { value: events, done } = await reader.read();
    if (done) {
      break;
    }
    if (events) {
      // There can be multiple events in the same message
      for (const event of events.split("\n\n")) {
        if (event.startsWith("data:")) {
          const { key, data } = JSON.parse(event.replace("data: ", ""));

          if (key === "running") {
            setMessage(data as string);
          } else if (key === "completed") {
            setMessage("✨ Opening report...");
            reader.cancel();
            const uuid = data as string;
            return uuid;
          } else if (key === "error") {
            reader.cancel();
            throw new Error(data as string);
          }
        }
      }
    }
  }

  throw new Error("Something went wrong");
}

export default function CreateNewRun({
  initialUrl = "",
  autoSubmit = false,
}: {
  initialUrl?: string;
  autoSubmit?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Initializing...");
  const router = useRouter();

  useEffect(() => {
    if (initialUrl && autoSubmit) {
      handleSubmit(new Event("submit") as unknown as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const urlToScan = url.trim() || initialUrl;
    setIsLoading(true);
    setError("");

    try {
      const run_uuid = await createRun(urlToScan, setMessage);
      router.push(`/dashboard/report/${run_uuid}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto w-full">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-slate-700/50">
              <LoadingStateSSE message={message} />
            </div>
          </motion.div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter your URL here"
                  required
                  className="flex-1 px-4 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-600/80 text-white border-slate-700/50 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 text-md font-medium text-white bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-lg hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 disabled:opacity-50 transition whitespace-nowrap shadow-lg shadow-blue-600/20 ring-1 ring-slate-700/50"
                >
                  <div>{isLoading ? "🤖 Analyzing..." : "✨ Check now"}</div>
                </button>
              </div>
            </form>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="mt-4 p-4 bg-red-900/20 border border-red-800/50 rounded-lg transition-all duration-300 animate-fade-in backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-red-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">Error</span>
                  </div>
                  <p className="mt-1 text-sm text-red-300">{error}</p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </>
  );
}
