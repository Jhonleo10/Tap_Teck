import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/db-connection";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
