interface AlertOptions {
  level: "info" | "warning" | "error";
  source?: string;
  error?: Error;
}

export async function sendAlert(
  message: string,
  options: AlertOptions = { level: "info" },
) {
  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "🚨",
  }[options.level];

  let formattedMessage = `${emoji} *${options.level.toUpperCase()}*\n\n`;

  if (options.source) {
    formattedMessage += `*Source:* ${options.source}\n`;
  }

  formattedMessage += `*Message:* ${message}\n`;

  if (options.error) {
    formattedMessage += `\n*Error Details:*\n\`\`\`\n${
      options.error.stack || options.error.message
    }\n\`\`\``;
  }

  console.log("[Alert] ", formattedMessage);
}

// Convenience methods
export const alert = {
  info: (message: string, source?: string) =>
    sendAlert(message, { level: "info", source }),

  warning: (message: string, source?: string) =>
    sendAlert(message, { level: "warning", source }),

  error: (message: string, error?: Error, source?: string) =>
    sendAlert(message, { level: "error", error, source }),
};
