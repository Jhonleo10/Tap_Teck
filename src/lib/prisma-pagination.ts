import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "@/lib/pagination";

export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function resolvePagination(params: PaginationParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function buildOrderBy(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc" | undefined,
  allowedFields: Record<string, boolean>,
  fallback: Record<string, "asc" | "desc">
) {
  if (sortBy && allowedFields[sortBy]) {
    return { [sortBy]: sortOrder ?? "desc" };
  }
  return fallback;
}
