import type { ActionResponse } from "@/types/action";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withPrismaRetry } from "@/lib/db-connection";
export function actionSuccess<T>(data?: T, message?: string): ActionResponse<T> {
  return { success: true, data, message };
}

export function actionFailure(error: string, message?: string): ActionResponse<never> {
  return { success: false, error, message };
}

export function actionFromError(error: unknown, context?: string): ActionResponse<never> {
  if (context) {
    logger.error(getSafeErrorMessage(error), context, error);
  }
  return { success: false, error: getSafeErrorMessage(error) };
}

export async function withAction<T>(
  fn: () => Promise<T>,
  context: string,
  message?: string
): Promise<ActionResponse<T>> {
  try {
    const data = await withPrismaRetry(fn);
    return actionSuccess(data, message);
  } catch (error) {
    return actionFromError(error, context);
  }
}