"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface DeferredMountProps {
  children: ReactNode;
  /** Delay before mounting children (lets critical UI paint first). */
  delayMs?: number;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Mounts children after a short delay or idle time so below-the-fold
 * widgets do not compete with the initial page data fetch.
 */
export function DeferredMount({
  children,
  delayMs = 800,
  fallback,
  className,
}: DeferredMountProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      if (!cancelled) setMounted(true);
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(mount, { timeout: delayMs });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const timer = setTimeout(mount, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs]);

  if (!mounted) {
    return (
      <div className={className}>
        {fallback ?? <LoadingSpinner className="py-8" text="Loading insights..." />}
      </div>
    );
  }

  return <>{children}</>;
}
