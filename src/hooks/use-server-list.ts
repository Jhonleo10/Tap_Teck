"use client";

import { useCallback, useState, useTransition } from "react";
import type { ActionResponse } from "@/types/action";
import type { PaginatedResult } from "@/lib/pagination";
import { isActionSuccess } from "@/lib/unwrap-action";

interface UseServerListOptions<T, F extends Record<string, unknown>> {
  initialData: PaginatedResult<T>;
  fetcher: (filters: F) => Promise<ActionResponse<PaginatedResult<T>>>;
  initialFilters?: F;
}

export function useServerList<T, F extends Record<string, unknown>>({
  initialData,
  fetcher,
  initialFilters,
}: UseServerListOptions<T, F>) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters ?? ({} as F));

  const load = useCallback(
    (nextFilters: F, page = 1, pageSize = data.pageSize) => {
      startTransition(async () => {
        const result = await fetcher({ ...nextFilters, page, pageSize } as F);
        if (isActionSuccess(result)) {
          setData(result.data);
          setFilters(nextFilters);
          setError(null);
        } else {
          setError(result.error ?? "Failed to load data");
        }
      });
    },
    [fetcher, data.pageSize]
  );

  const changePage = useCallback(
    (page: number, pageSize?: number) => {
      load(filters, page, pageSize ?? data.pageSize);
    },
    [load, filters, data.pageSize]
  );

  const applyFilters = useCallback(
    (nextFilters: F) => {
      load(nextFilters, 1, data.pageSize);
    },
    [load, data.pageSize]
  );

  const retry = useCallback(() => {
    load(filters, data.page, data.pageSize);
  }, [load, filters, data.page, data.pageSize]);

  return {
    data,
    error,
    isPending,
    filters,
    load,
    changePage,
    applyFilters,
    retry,
  };
}
