"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import type { Prisma, RewardType } from "@prisma/client";
import type { ActionResponse } from "@/types/action";

export interface ReferralFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const REFERRAL_SELECT = {
  id: true,
  referralCode: true,
  status: true,
  rewardAmount: true,
  createdAt: true,
  inviter: { select: { name: true, email: true, referralCode: true } },
  referredUser: { select: { name: true, email: true } },
} satisfies Prisma.ReferralSelect;

const REFERRAL_SORT_FIELDS = {
  createdAt: true,
  rewardAmount: true,
  status: true,
} as const;

function buildReferralWhere(filters: ReferralFilters = {}): Prisma.ReferralWhereInput {
  const { search } = filters;
  if (!search) return {};

  return {
    OR: [
      { inviter: { name: { contains: search, mode: "insensitive" } } },
      { inviter: { email: { contains: search, mode: "insensitive" } } },
      { inviter: { referralCode: { contains: search, mode: "insensitive" } } },
      { referredUser: { name: { contains: search, mode: "insensitive" } } },
      { referredUser: { email: { contains: search, mode: "insensitive" } } },
    ],
  };
}

export async function getReferrals(filters: ReferralFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildReferralWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      REFERRAL_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        select: REFERRAL_SELECT,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.referral.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getReferrals");
}

export async function getRewards(filters: ReferralFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      { createdAt: true },
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.reward.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.reward.count(),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getRewards");
}

export async function getTopPerformers() {
  return withAction(async () => {
    const [highestRated, mostJobs, bestReviews] = await Promise.all([
      prisma.provider.findFirst({
        where: { isVerified: true },
        orderBy: { rating: "desc" },
        select: {
          id: true,
          businessName: true,
          rating: true,
          user: { select: { name: true } },
        },
      }),
      prisma.provider.findFirst({
        where: { isVerified: true },
        orderBy: { completedJobs: "desc" },
        select: {
          id: true,
          businessName: true,
          completedJobs: true,
          user: { select: { name: true } },
        },
      }),
      prisma.provider.findFirst({
        where: { isVerified: true },
        orderBy: { totalReviews: "desc" },
        select: {
          id: true,
          businessName: true,
          totalReviews: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    return { highestRated, mostJobs, bestReviews };
  }, "getTopPerformers");
}

export async function assignReward(data: {
  title: string;
  description?: string;
  type: RewardType;
  userId?: string;
  providerId?: string;
  value?: number;
  assignedBy: string;
}): Promise<ActionResponse> {
  return withAction(async () => {
    await prisma.reward.create({ data });
    revalidatePath("/referrals");
    return undefined;
  }, "assignReward", "Reward assigned");
}

export async function autoAssignRewards(adminId: string): Promise<ActionResponse<{ count: number }>> {
  return withAction(async () => {
    const performersResult = await getTopPerformers();
    if (!performersResult.success || !performersResult.data) {
      throw new Error(performersResult.error ?? "Failed to load performers");
    }

    const performers = performersResult.data;
    const rewards = [];

    if (performers.highestRated) {
      rewards.push({
        type: "HIGHEST_RATED" as const,
        title: "Highest Rated Provider",
        description: `${performers.highestRated.businessName} - Rating: ${performers.highestRated.rating}`,
        providerId: performers.highestRated.id,
        isAutomatic: true,
        assignedBy: adminId,
      });
    }

    if (performers.mostJobs) {
      rewards.push({
        type: "MOST_JOBS" as const,
        title: "Most Completed Jobs",
        description: `${performers.mostJobs.businessName} - ${performers.mostJobs.completedJobs} jobs`,
        providerId: performers.mostJobs.id,
        isAutomatic: true,
        assignedBy: adminId,
      });
    }

    if (performers.bestReviews) {
      rewards.push({
        type: "BEST_REVIEWS" as const,
        title: "Best Reviews",
        description: `${performers.bestReviews.businessName} - ${performers.bestReviews.totalReviews} reviews`,
        providerId: performers.bestReviews.id,
        isAutomatic: true,
        assignedBy: adminId,
      });
    }

    if (rewards.length > 0) {
      await prisma.reward.createMany({ data: rewards });
    }

    revalidatePath("/referrals");
    return { count: rewards.length };
  }, "autoAssignRewards", "Automatic rewards assigned");
}
