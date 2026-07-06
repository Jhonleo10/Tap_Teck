"use server";

import { prisma } from "@/lib/prisma";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import type { Prisma } from "@prisma/client";
import type { ActionResponse } from "@/types/action";

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const AUDIT_LOG_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  adminId: true,
  adminName: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

const AUDIT_SORT_FIELDS = {
  createdAt: true,
  action: true,
  entityType: true,
} as const;

function buildAuditWhere(filters: AuditLogFilters = {}): Prisma.AuditLogWhereInput {
  const { search, action, entityType, dateFrom, dateTo } = filters;

  return {
    ...(action && action !== "all" ? { action } : {}),
    ...(entityType && entityType !== "all" ? { entityType } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entityType: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } },
            { adminName: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildAuditWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      AUDIT_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: AUDIT_LOG_SELECT,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getAuditLogs");
}

export async function getAuditFilterOptions(): Promise<
  ActionResponse<{ actions: string[]; entityTypes: string[] }>
> {
  return withAction(async () => {
    const [actionRows, entityRows] = await Promise.all([
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" },
      }),
      prisma.auditLog.findMany({
        select: { entityType: true },
        distinct: ["entityType"],
        orderBy: { entityType: "asc" },
      }),
    ]);

    return {
      actions: actionRows.map((r) => r.action),
      entityTypes: entityRows.map((r) => r.entityType),
    };
  }, "getAuditFilterOptions");
}
