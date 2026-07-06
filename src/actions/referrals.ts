"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import { createAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { generateReferralCode } from "@/lib/utils";
import type { Prisma, ReferralStatus, RewardStatus, RewardType } from "@prisma/client";
import type { ActionResponse } from "@/types/action";

export interface ReferralFilters {
  search?: string;
  status?: ReferralStatus | "ALL";
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface RewardFilters {
  search?: string;
  status?: RewardStatus | "ALL";
  type?: RewardType | "ALL";
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReferralStats {
  total: number;
  completed: number;
  pending: number;
  expired: number;
  conversionRate: number;
  totalRewardsPaid: number;
  activeRewards: number;
  defaultRewardAmount: number;
}

const REFERRAL_SELECT = {
  id: true,
  referralCode: true,
  status: true,
  rewardAmount: true,
  createdAt: true,
  inviter: { select: { id: true, name: true, email: true, referralCode: true } },
  referredUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ReferralSelect;

const REFERRAL_SORT_FIELDS = {
  createdAt: true,
  rewardAmount: true,
  status: true,
} as const;

function buildCountryReferralWhere(country?: string): Prisma.ReferralWhereInput {
  if (!country) return {};
  return {
    OR: [
      { inviter: { provider: { country } } },
      { inviter: { bookings: { some: { country } } } },
      { referredUser: { bookings: { some: { country } } } },
    ],
  };
}

function buildReferralWhere(filters: ReferralFilters = {}): Prisma.ReferralWhereInput {
  const { search, status, dateFrom, dateTo, country } = filters;
  const and: Prisma.ReferralWhereInput[] = [];

  const countryClause = buildCountryReferralWhere(country);
  if (Object.keys(countryClause).length > 0) and.push(countryClause);

  if (status && status !== "ALL") and.push({ status });

  if (dateFrom || dateTo) {
    and.push({
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    });
  }

  if (search) {
    and.push({
      OR: [
        { referralCode: { contains: search, mode: "insensitive" } },
        { inviter: { name: { contains: search, mode: "insensitive" } } },
        { inviter: { email: { contains: search, mode: "insensitive" } } },
        { inviter: { referralCode: { contains: search, mode: "insensitive" } } },
        { referredUser: { name: { contains: search, mode: "insensitive" } } },
        { referredUser: { email: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (and.length === 0) return {};
  if (and.length === 1) return and[0];
  return { AND: and };
}

function buildRewardWhere(filters: RewardFilters = {}): Prisma.RewardWhereInput {
  const { search, status, type } = filters;
  return {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(type && type !== "ALL" ? { type } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

async function enrichRewards<
  T extends { providerId: string | null; user: { name: string | null; email: string } | null },
>(items: T[]) {
  const providerIds = [
    ...new Set(items.map((i) => i.providerId).filter((id): id is string => Boolean(id))),
  ];
  const providers =
    providerIds.length > 0
      ? await prisma.provider.findMany({
          where: { id: { in: providerIds } },
          select: { id: true, businessName: true },
        })
      : [];
  const providerMap = new Map(providers.map((p) => [p.id, p.businessName]));

  return items.map((item) => ({
    ...item,
    providerName: item.providerId ? providerMap.get(item.providerId) ?? null : null,
    recipientLabel:
      item.providerId && providerMap.get(item.providerId)
        ? providerMap.get(item.providerId)!
        : item.user?.name ?? item.user?.email ?? "—",
  }));
}

export async function getReferralStats(
  filters: Omit<ReferralFilters, "page" | "pageSize" | "sortBy" | "sortOrder"> = {}
): Promise<ActionResponse<ReferralStats>> {
  return withAction(async () => {
    const where = buildReferralWhere(filters);
    const settings = await prisma.appSettings.findFirst();

    const [total, completed, pending, expired, rewardsSum, activeRewards] = await Promise.all([
      prisma.referral.count({ where }),
      prisma.referral.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.referral.count({ where: { ...where, status: "PENDING" } }),
      prisma.referral.count({ where: { ...where, status: "EXPIRED" } }),
      prisma.referral.aggregate({ where, _sum: { rewardAmount: true } }),
      prisma.reward.count({ where: { status: "ACTIVE" } }),
    ]);

    return {
      total,
      completed,
      pending,
      expired,
      conversionRate: total > 0 ? completed / total : 0,
      totalRewardsPaid: rewardsSum._sum.rewardAmount ?? 0,
      activeRewards,
      defaultRewardAmount: settings?.referralRewardAmount ?? 100,
    };
  }, "getReferralStats");
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

export async function getRewards(filters: RewardFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildRewardWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      { createdAt: true },
      { createdAt: "desc" as const }
    );

    const [rawItems, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.reward.count({ where }),
    ]);

    const items = await enrichRewards(rawItems);
    return toPaginatedResult(items, total, page, pageSize);
  }, "getRewards");
}

export async function getTopPerformers(country?: string) {
  return withAction(async () => {
    const where = country ? { country, isVerified: true } : { isVerified: true };

    const [highestRated, mostJobs, bestReviews] = await Promise.all([
      prisma.provider.findFirst({
        where,
        orderBy: { rating: "desc" },
        select: {
          id: true,
          businessName: true,
          rating: true,
          user: { select: { name: true } },
        },
      }),
      prisma.provider.findFirst({
        where,
        orderBy: { completedJobs: "desc" },
        select: {
          id: true,
          businessName: true,
          completedJobs: true,
          user: { select: { name: true } },
        },
      }),
      prisma.provider.findFirst({
        where,
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

export async function searchReferralUsers(query: string) {
  return withAction(async () => {
    if (!query.trim()) return [];

    const users = await prisma.user.findMany({
      where: {
        role: "USER",
        status: { not: "SUSPENDED" },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { id: { contains: query, mode: "insensitive" } },
          { referralCode: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        referredById: true,
      },
      orderBy: { name: "asc" },
    });

    return users;
  }, "searchReferralUsers");
}

async function ensureUserReferralCode(user: {
  id: string;
  name: string | null;
  email: string;
  referralCode: string | null;
}) {
  if (user.referralCode) return user.referralCode;

  let code = generateReferralCode(user.name ?? user.email);
  for (let attempt = 0; attempt < 8; attempt++) {
    const taken = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!taken) break;
    code = generateReferralCode(user.name ?? user.email);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { referralCode: code },
  });

  return code;
}

export async function assignReferral(data: {
  inviterId: string;
  referredUserId: string;
  status?: ReferralStatus;
}): Promise<ActionResponse<{ id: string; referralCode: string }>> {
  return withAction(async () => {
    if (data.inviterId === data.referredUserId) {
      throw new Error("A user cannot refer themselves");
    }

    const session = await auth();
    const settings = await prisma.appSettings.findFirst();
    const defaultReward = settings?.referralRewardAmount ?? 100;
    const status = data.status ?? "PENDING";

    const [inviter, referred] = await Promise.all([
      prisma.user.findUnique({
        where: { id: data.inviterId },
        select: { id: true, name: true, email: true, referralCode: true, role: true, status: true },
      }),
      prisma.user.findUnique({
        where: { id: data.referredUserId },
        select: { id: true, name: true, email: true, referredById: true, role: true, status: true },
      }),
    ]);

    if (!inviter || inviter.role !== "USER") {
      throw new Error("Inviter not found");
    }
    if (!referred || referred.role !== "USER") {
      throw new Error("Referred user not found");
    }
    if (inviter.status === "SUSPENDED" || referred.status === "SUSPENDED") {
      throw new Error("Cannot assign referral for suspended users");
    }

    const existing = await prisma.referral.findFirst({
      where: {
        inviterId: data.inviterId,
        referredUserId: data.referredUserId,
      },
    });
    if (existing) {
      throw new Error("This referral relationship already exists");
    }

    const alreadyReferred = await prisma.referral.findFirst({
      where: { referredUserId: data.referredUserId },
    });
    if (alreadyReferred) {
      throw new Error("This user has already been referred by someone else");
    }

    const referralCode = await ensureUserReferralCode(inviter);

    const referral = await prisma.referral.create({
      data: {
        inviterId: data.inviterId,
        referredUserId: data.referredUserId,
        referralCode,
        status,
        rewardAmount: status === "COMPLETED" ? defaultReward : 0,
      },
    });

    if (!referred.referredById) {
      await prisma.user.update({
        where: { id: data.referredUserId },
        data: { referredById: data.inviterId },
      });
    }

    await createAuditLog({
      action: "REFERRAL_ASSIGNED",
      entityType: "Referral",
      entityId: referral.id,
      adminId: session?.user?.id,
      adminName: session?.user?.name ?? undefined,
      metadata: {
        inviterId: data.inviterId,
        referredUserId: data.referredUserId,
        referralCode,
        status,
      },
    });

    revalidatePath("/referrals");
    return { id: referral.id, referralCode };
  }, "assignReferral", "Referral assigned successfully");
}

export async function searchRewardRecipients(query: string) {
  return withAction(async () => {
    if (!query.trim()) return { users: [], providers: [] };

    const [users, providers] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "USER",
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { id: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: { id: true, name: true, email: true, referralCode: true },
      }),
      prisma.provider.findMany({
        where: {
          OR: [
            { businessName: { contains: query, mode: "insensitive" } },
            { user: { email: { contains: query, mode: "insensitive" } } },
          ],
        },
        take: 8,
        select: {
          id: true,
          businessName: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return { users, providers };
  }, "searchRewardRecipients");
}

export async function updateReferralStatus(
  referralId: string,
  status: ReferralStatus
): Promise<ActionResponse> {
  return withAction(async () => {
    const session = await auth();
    const settings = await prisma.appSettings.findFirst();
    const defaultReward = settings?.referralRewardAmount ?? 100;

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status,
        ...(status === "COMPLETED" ? { rewardAmount: defaultReward } : {}),
      },
    });

    await createAuditLog({
      action: `REFERRAL_${status}`,
      entityType: "Referral",
      entityId: referralId,
      adminId: session?.user?.id,
      adminName: session?.user?.name ?? undefined,
      metadata: { referralCode: referral.referralCode, rewardAmount: referral.rewardAmount },
    });

    revalidatePath("/referrals");
    return undefined;
  }, "updateReferralStatus", "Referral status updated");
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
    if (!data.userId && !data.providerId) {
      throw new Error("Select a customer or provider recipient");
    }

    const session = await auth();
    const reward = await prisma.reward.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        userId: data.userId,
        providerId: data.providerId,
        value: data.value,
        assignedBy: data.assignedBy,
        isAutomatic: false,
        status: "ACTIVE",
      },
    });

    await createAuditLog({
      action: "REWARD_ASSIGNED",
      entityType: "Reward",
      entityId: reward.id,
      adminId: session?.user?.id,
      adminName: session?.user?.name ?? undefined,
      metadata: { title: data.title, type: data.type },
    });

    revalidatePath("/referrals");
    return undefined;
  }, "assignReward", "Reward assigned");
}

export async function autoAssignRewards(
  adminId: string,
  country?: string
): Promise<ActionResponse<{ count: number }>> {
  return withAction(async () => {
    const performersResult = await getTopPerformers(country);
    if (!performersResult.success || !performersResult.data) {
      throw new Error(performersResult.error ?? "Failed to load performers");
    }

    const performers = performersResult.data;
    const session = await auth();
    const rewards: Prisma.RewardCreateManyInput[] = [];

    const pushIfNew = async (
      type: RewardType,
      title: string,
      description: string,
      providerId: string
    ) => {
      const existing = await prisma.reward.findFirst({
        where: {
          providerId,
          type,
          status: "ACTIVE",
          createdAt: { gte: new Date(new Date().setDate(1)) },
        },
      });
      if (existing) return;
      rewards.push({
        type,
        title,
        description,
        providerId,
        isAutomatic: true,
        assignedBy: adminId,
        status: "ACTIVE",
      });
    };

    if (performers.highestRated) {
      await pushIfNew(
        "HIGHEST_RATED",
        "Highest Rated Provider",
        `${performers.highestRated.businessName} — ${performers.highestRated.rating.toFixed(1)}★`,
        performers.highestRated.id
      );
    }

    if (performers.mostJobs) {
      await pushIfNew(
        "MOST_JOBS",
        "Most Completed Jobs",
        `${performers.mostJobs.businessName} — ${performers.mostJobs.completedJobs} jobs`,
        performers.mostJobs.id
      );
    }

    if (performers.bestReviews) {
      await pushIfNew(
        "BEST_REVIEWS",
        "Best Reviews",
        `${performers.bestReviews.businessName} — ${performers.bestReviews.totalReviews} reviews`,
        performers.bestReviews.id
      );
    }

    if (rewards.length > 0) {
      await prisma.reward.createMany({ data: rewards });
      for (const r of rewards) {
        await createAuditLog({
          action: "REWARD_AUTO_ASSIGNED",
          entityType: "Reward",
          entityId: r.providerId ?? "batch",
          adminId: session?.user?.id,
          adminName: session?.user?.name ?? undefined,
          metadata: { type: r.type, title: r.title },
        });
      }
    }

    revalidatePath("/referrals");
    return { count: rewards.length };
  }, "autoAssignRewards", "Automatic rewards assigned");
}
