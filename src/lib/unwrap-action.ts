import type { ActionResponse } from "@/types/action";

export function unwrapAction<T>(
  response: ActionResponse<T>,
  fallbackMessage = "Request failed"
): T {
  if (!response.success) {
    throw new Error(response.error ?? fallbackMessage);
  }
  return response.data as T;
}

export function isActionSuccess<T>(
  response: ActionResponse<T>
): response is ActionResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}
