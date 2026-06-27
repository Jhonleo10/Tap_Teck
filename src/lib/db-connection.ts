import { Prisma } from "@prisma/client";

const TRANSIENT_DB_PATTERNS = [
  "can't reach database server",
  "connection terminated",
  "connection timeout",
  "timed out",
  "econnrefused",
  "enotfound",
  "server closed the connection",
];

export function appendPostgresParams(
  url: string,
  params: Record<string, string>
): string {
  const [base, query = ""] = url.split("?");
  const search = new URLSearchParams(query);

  for (const [key, value] of Object.entries(params)) {
    if (!search.has(key)) {
      search.set(key, value);
    }
  }

  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export function resolveDatabaseUrl(rawUrl?: string): string {
  const url = rawUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const isNeon = url.includes("neon.tech");
  const usesPooler = url.includes("-pooler");

  return appendPostgresParams(url, {
    connect_timeout: "60",
    ...(isNeon ? { pool_timeout: "30" } : {}),
    ...(usesPooler ? { pgbouncer: "true" } : {}),
  });
}

export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001") {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return TRANSIENT_DB_PATTERNS.some((pattern) => message.includes(pattern));
  }

  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetPrismaConnection() {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect errors during recovery.
  }
}

export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === maxAttempts) {
        throw error;
      }
      await resetPrismaConnection();
      await sleep(2000 * attempt);
    }
  }

  throw lastError;
}

export async function ensureDbConnection(maxAttempts = 4) {
  const { prisma } = await import("@/lib/prisma");
  await withPrismaRetry(() => prisma.$queryRaw`SELECT 1`, maxAttempts);
}
