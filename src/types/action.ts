import type { PaginatedResult } from "@/lib/pagination";

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type PaginatedActionData<T> = PaginatedResult<T>;
