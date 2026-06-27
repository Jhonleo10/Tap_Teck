"use server";

import { prisma } from "@/lib/prisma";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import type { Prisma } from "@prisma/client";

export interface ReviewFilters {
  rating?: number | "ALL";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
  provider: { select: { businessName: true } },
  booking: { select: { bookingNumber: true, serviceName: true } },
} satisfies Prisma.ReviewSelect;

const REVIEW_SORT_FIELDS = {
  createdAt: true,
  rating: true,
} as const;

function buildReviewWhere(filters: ReviewFilters = {}): Prisma.ReviewWhereInput {
  const { rating, search, dateFrom, dateTo } = filters;

  return {
    ...(rating && rating !== "ALL" ? { rating } : {}),
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
            { comment: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { provider: { businessName: { contains: search, mode: "insensitive" } } },
            { booking: { bookingNumber: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function getReviews(filters: ReviewFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildReviewWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      REVIEW_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        select: REVIEW_SELECT,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.review.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getReviews");
}
