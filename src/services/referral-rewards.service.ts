import { prisma } from "@/lib/prisma";
import { calculatePerformanceScore } from "@/services/performance-engine.service";

export interface RewardLeaderboardEntry {
  providerId: string;
  businessName: string;
  category: "HIGHEST_RATED" | "MOST_JOBS" | "BEST_REVIEWS" | "HIGHEST_REVENUE";
  score: number;
  metric: string;
}

export interface ReferralOperationsStats {
  totalReferrals: number;
  completedReferrals: number;
  conversionRate: number;
  totalRewardsPaid: number;
  topReferrers: {
    name: string;
    email: string;
    referralCode: string | null;
    count: number;
    revenue: number;
  }[];
}

export async function getRewardLeaderboard(
  country?: string
): Promise<RewardLeaderboardEntry[]> {
  const where = country ? { country, isVerified: true } : { isVerified: true };

  const [highestRated, mostJobs, bestReviews, revenueLeaders] = await Promise.all([
    prisma.provider.findFirst({
      where,
      orderBy: { rating: "desc" },
      select: { id: true, businessName: true, rating: true },
    }),
    prisma.provider.findFirst({
      where,
      orderBy: { completedJobs: "desc" },
      select: { id: true, businessName: true, completedJobs: true },
    }),
    prisma.provider.findFirst({
      where,
      orderBy: { totalReviews: "desc" },
      select: { id: true, businessName: true, totalReviews: true },
    }),
    prisma.booking.groupBy({
      by: ["providerId"],
      where: { ...(country ? { country } : {}), status: "COMPLETED" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    }),
  ]);

  const entries: RewardLeaderboardEntry[] = [];

  if (highestRated) {
    entries.push({
      providerId: highestRated.id,
      businessName: highestRated.businessName,
      category: "HIGHEST_RATED",
      score: highestRated.rating,
      metric: `${highestRated.rating.toFixed(1)}★`,
    });
  }
  if (mostJobs) {
    entries.push({
      providerId: mostJobs.id,
      businessName: mostJobs.businessName,
      category: "MOST_JOBS",
      score: mostJobs.completedJobs,
      metric: `${mostJobs.completedJobs} jobs`,
    });
  }
  if (bestReviews) {
    entries.push({
      providerId: bestReviews.id,
      businessName: bestReviews.businessName,
      category: "BEST_REVIEWS",
      score: bestReviews.totalReviews,
      metric: `${bestReviews.totalReviews} reviews`,
    });
  }

  if (revenueLeaders[0]) {
    const provider = await prisma.provider.findUnique({
      where: { id: revenueLeaders[0].providerId },
      select: { id: true, businessName: true },
    });
    if (provider) {
      entries.push({
        providerId: provider.id,
        businessName: provider.businessName,
        category: "HIGHEST_REVENUE",
        score: revenueLeaders[0]._sum.amount ?? 0,
        metric: `₹${Math.round(revenueLeaders[0]._sum.amount ?? 0).toLocaleString()}`,
      });
    }
  }

  return entries;
}

export async function getReferralOperationsStats(
  country?: string
): Promise<ReferralOperationsStats> {
  const countryWhere = country
    ? {
        OR: [
          { inviter: { provider: { country } } },
          { inviter: { bookings: { some: { country } } } },
          { referredUser: { bookings: { some: { country } } } },
        ],
      }
    : {};

  const [total, completed, rewardsSum, referrers] = await Promise.all([
    prisma.referral.count({ where: countryWhere }),
    prisma.referral.count({ where: { ...countryWhere, status: "COMPLETED" } }),
    prisma.referral.aggregate({ where: countryWhere, _sum: { rewardAmount: true } }),
    prisma.user.findMany({
      where: {
        referralsMade: { some: countryWhere },
      },
      select: {
        name: true,
        email: true,
        referralCode: true,
        _count: { select: { referralsMade: true } },
        referralsMade: { select: { rewardAmount: true } },
      },
      orderBy: { referralsMade: { _count: "desc" } },
      take: 5,
    }),
  ]);

  return {
    totalReferrals: total,
    completedReferrals: completed,
    conversionRate: total > 0 ? completed / total : 0,
    totalRewardsPaid: rewardsSum._sum.rewardAmount ?? 0,
    topReferrers: referrers.map((r) => ({
      name: r.name ?? r.email,
      email: r.email,
      referralCode: r.referralCode,
      count: r._count.referralsMade,
      revenue: r.referralsMade.reduce((s, ref) => s + ref.rewardAmount, 0),
    })),
  };
}

export async function computeMonthlyLeaderboard(country?: string) {
  const providers = await prisma.provider.findMany({
    where: country ? { country, isVerified: true } : { isVerified: true },
    select: {
      id: true,
      businessName: true,
      rating: true,
      completedJobs: true,
      totalReviews: true,
    },
    take: 50,
  });

  return providers
    .map((p) => ({
      ...p,
      performance: calculatePerformanceScore({
        rating: p.rating,
        completedJobs: p.completedJobs,
        totalReviews: p.totalReviews,
        acceptanceRate: 0.85,
        cancellationRate: 0.05,
        avgResponseMinutes: 40,
      }),
    }))
    .sort((a, b) => b.performance.score - a.performance.score)
    .slice(0, 10);
}
