"use client";

interface StatusBadgeProps {
  state: string;
}

export default function StatusBadge({ state }: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
        state === "completed"
          ? "bg-green-200 text-green-800"
          : state === "failed"
            ? "bg-red-200 text-red-800"
            : "bg-yellow-200 text-yellow-800"
      }`}
    >
      {state === "running" && (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {state}
    </span>
  );
}
