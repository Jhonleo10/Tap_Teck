"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { ActionResponse } from "@/types/action";

interface UseOperationsPollOptions<T> {
  fetcher: () => Promise<ActionResponse<T>>;
  intervalMs?: number;
  enabled?: boolean;
  initialData?: T | null;
  /** Skips fetch on mount when server already provided initialData. */
  skipInitialFetch?: boolean;
  /** Delays first fetch when not skipping (or background refresh when skipping). */
  deferMs?: number;
}

export function useOperationsPoll<T>({
  fetcher,
  intervalMs = 60_000,
  enabled = true,
  initialData = null,
  skipInitialFetch = false,
  deferMs = 0,
}: UseOperationsPollOptions<T>) {
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await fetcher();
      if (result.success && result.data !== undefined) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Sync failed");
      }
    });
  }, [fetcher]);

  useEffect(() => {
    if (initialData != null) setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!enabled) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const skipMountFetch = skipInitialFetch && initialData != null;

    if (!skipMountFetch) {
      timers.push(setTimeout(refresh, deferMs));
    } else if (deferMs > 0) {
      timers.push(setTimeout(refresh, deferMs));
    }

    const intervalId = setInterval(refresh, intervalMs);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, intervalMs, refresh, skipInitialFetch, initialData, deferMs]);

  return { data, error, isPending, refresh };
}
