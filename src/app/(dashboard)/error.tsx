"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/shared/error-card";

export default function DashboardGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  const isDatabaseError =
    error.message.toLowerCase().includes("can't reach database server") ||
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("P1001");

  return (
    <ErrorCard
      title={isDatabaseError ? "Database unavailable" : "Something went wrong"}
      message={
        isDatabaseError
          ? "The database could not be reached. If you use Neon, the project may be waking from sleep — wait a few seconds and try again."
          : "We couldn't load this page. Please try again."
      }
      onRetry={reset}
    />
  );
}
