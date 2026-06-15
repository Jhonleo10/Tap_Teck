"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { RewardType } from "@prisma/client";

export async function getReferrals() {
  return prisma.referral.findMany({
    include: {
      inviter: { select: { name: true, email: true, referralCode: true } },
      referredUser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRewards() {
  return prisma.reward.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTopPerformers() {
  const [highestRated, mostJobs, bestReviews] = await Promise.all([
    prisma.provider.findFirst({
      where: { isVerified: true },
      orderBy: { rating: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.provider.findFirst({
      where: { isVerified: true },
      orderBy: { completedJobs: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.provider.findFirst({
      where: { isVerified: true },
      orderBy: { totalReviews: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return { highestRated, mostJobs, bestReviews };
}

export async function assignReward(data: {
  title: string;
  description?: string;
  type: RewardType;
  userId?: string;
  providerId?: string;
  value?: number;
  assignedBy: string;
}) {
  await prisma.reward.create({ data });
  revalidatePath("/referrals");
  return { success: true };
}

export async function autoAssignRewards(adminId: string) {
  const performers = await getTopPerformers();
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
  return { success: true, count: rewards.length };
}
