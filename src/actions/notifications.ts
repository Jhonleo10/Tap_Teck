"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import type { Prisma } from "@prisma/client";
import type { ActionResponse } from "@/types/action";

export interface NotificationFilters {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  read: true,
  createdAt: true,
  providerId: true,
  userId: true,
  provider: { select: { businessName: true } },
  user: { select: { name: true, email: true } },
} satisfies Prisma.NotificationSelect;

const NOTIFICATION_SORT_FIELDS = {
  createdAt: true,
  read: true,
  type: true,
} as const;

function buildNotificationWhere(filters: NotificationFilters = {}): Prisma.NotificationWhereInput {
  const { unreadOnly, search } = filters;

  return {
    ...(unreadOnly ? { read: false } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
            { type: { contains: search, mode: "insensitive" } },
            { provider: { businessName: { contains: search, mode: "insensitive" } } },
            { user: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function getNotifications(filters: NotificationFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildNotificationWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      NOTIFICATION_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: NOTIFICATION_SELECT,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { read: false } }),
    ]);

    return {
      ...toPaginatedResult(items, total, page, pageSize),
      unreadCount,
    };
  }, "getNotifications");
}

export async function markNotificationRead(id: string): Promise<ActionResponse> {
  return withAction(async () => {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    revalidatePath("/notifications");
    return undefined;
  }, "markNotificationRead", "Notification marked as read");
}

/** Latest notifications for header bell (max 5) + unread count */
export async function getHeaderNotifications() {
  return withAction(async () => {
    const [items, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: NOTIFICATION_SELECT,
      }),
      prisma.notification.count({ where: { read: false } }),
      prisma.notification.count(),
    ]);

    return { items, unreadCount, total };
  }, "getHeaderNotifications");
}
