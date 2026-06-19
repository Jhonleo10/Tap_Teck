"use server";

import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where = params.search
    ? {
        OR: [
          { action: { contains: params.search, mode: "insensitive" as const } },
          { entityType: { contains: params.search, mode: "insensitive" as const } },
          { adminName: { contains: params.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getNotifications(params: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where = params.unreadOnly ? { read: false } : {};

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        provider: { select: { businessName: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { read: false } }),
  ]);

  return {
    items,
    total,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function markNotificationRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return { success: true };
}
