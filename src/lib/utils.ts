import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case "critical":
      return "🚨 Must Fix";
    case "important":
      return "⚠️ Should Fix";
    case "minor":
      return "💡 Consider Fixing";
    default:
      return severity;
  }
};

export const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-l-4 border-red-500";
    case "important":
      return "bg-yellow-100 text-amber-800 border-l-4 border-amber-500";
    case "minor":
      return "bg-blue-100 text-blue-800 border-l-4 border-blue-500";
    default:
      return "";
  }
};
