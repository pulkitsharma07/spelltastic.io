"use client";

import { useState } from "react";

interface UUIDDisplayProps {
  uuid: string;
  displayLength?: number;
}

export default function UUIDDisplay({
  uuid,
  displayLength = 8,
}: UUIDDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div className="flex items-center gap-2">
      <span>{uuid.slice(0, displayLength)}...</span>
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-gray-100 rounded relative group"
        title={copied ? "Copied!" : "Copy UUID"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-500"
        >
          {copied ? (
            <path d="M20 6L9 17L4 12" />
          ) : (
            <>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </>
          )}
        </svg>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {copied ? "Copied!" : "Copy UUID"}
        </span>
      </button>
    </div>
  );
}
