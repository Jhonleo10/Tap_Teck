"use server";

import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import type { Prisma, UserStatus } from "@prisma/client";
import type { ActionResponse, PaginatedActionData } from "@/types/action";

export interface UserFilters {
  search?: string;
  status?: UserStatus | "ALL";
  activity?: "ALL" | "WITH_BOOKINGS" | "NO_BOOKINGS";
  hasReferral?: "ALL" | "YES" | "NO";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  referralCode: true,
  emailVerified: true,
  image: true,
  referredById: true,
  _count: { select: { bookings: true, reviews: true } },
} satisfies Prisma.UserSelect;

const USER_SORT_FIELDS = {
  createdAt: true,
  name: true,
  email: true,
  status: true,
} as const;

function buildUserWhere(filters: UserFilters = {}): Prisma.UserWhereInput {
  const { search, status, activity, hasReferral, dateFrom, dateTo } = filters;

  return {
    role: "USER",
    ...(status && status !== "ALL" ? { status } : {}),
    ...(activity === "WITH_BOOKINGS"
      ? { bookings: { some: {} } }
      : activity === "NO_BOOKINGS"
        ? { bookings: { none: {} } }
        : {}),
    ...(hasReferral === "YES"
      ? { referralCode: { not: null } }
      : hasReferral === "NO"
        ? { referralCode: null }
        : {}),
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
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { referralCode: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function getUserStats(
  filters: Omit<UserFilters, "page" | "pageSize" | "sortBy" | "sortOrder"> = {}
): Promise<ActionResponse<UserStats>> {
  return withAction(async () => {
    const where = buildUserWhere(filters);
    const [total, active, inactive, suspended] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.user.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.user.count({ where: { ...where, status: "SUSPENDED" } }),
    ]);
    return { total, active, inactive, suspended };
  }, "getUserStats");
}

export async function getUsers(filters: UserFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildUserWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      USER_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: USER_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getUsers");
}

export type UserListItem = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;
export type UsersPageData = PaginatedActionData<UserListItem>;

export type UserDetail = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    role: true;
    status: true;
    referralCode: true;
    referredById: true;
    emailVerified: true;
    image: true;
    createdAt: true;
    updatedAt: true;
    _count: { select: { bookings: true; reviews: true; referralsMade: true } };
    bookings: {
      select: {
        bookingNumber: true;
        serviceName: true;
        status: true;
        amount: true;
        createdAt: true;
      };
    };
  };
}>;

export async function getUserById(userId: string): Promise<ActionResponse<UserDetail>> {
  return withAction(async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        referralCode: true,
        referredById: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { bookings: true, reviews: true, referralsMade: true } },
        bookings: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            bookingNumber: true,
            serviceName: true,
            status: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }, "getUserById");
}
