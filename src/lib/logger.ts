type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: string;
  error?: {
    name: string;
    message: string;
    code?: string;
  };
}

function formatPayload(payload: LogPayload): string {
  return JSON.stringify(payload);
}

function log(level: LogLevel, message: string, context?: string, error?: unknown) {
  const payload: LogPayload = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof Error) {
    payload.error = {
      name: error.name,
      message: error.message,
      code: "code" in error ? String((error as { code?: unknown }).code) : undefined,
    };
  }

  const line = formatPayload(payload);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(line);
      }
      break;
    default:
      console.info(line);
  }
}

export const logger = {
  debug: (message: string, context?: string) => log("debug", message, context),
  info: (message: string, context?: string) => log("info", message, context),
  warn: (message: string, context?: string, error?: unknown) =>
    log("warn", message, context, error),
  error: (message: string, context?: string, error?: unknown) =>
    log("error", message, context, error),
};
