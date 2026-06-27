import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = "APP_ERROR",
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
  }
}

const PRISMA_FRIENDLY_MESSAGES: Partial<Record<string, string>> = {
  P1001:
    "Unable to reach the database. If you use Neon, wait a few seconds and try again while the database wakes up.",
  P2002: "A record with this value already exists.",
  P2025: "The requested record was not found.",
  P2003: "This operation references a record that does not exist.",
};
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_FRIENDLY_MESSAGES[error.code] ?? "A database error occurred.";
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid data provided.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Unable to connect to the database. Please check that the database is running and try again.";
  }

  if (error instanceof Error) {
    return "An unexpected error occurred.";
  }

  return "An unexpected error occurred.";
}

export function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError
  );
}
