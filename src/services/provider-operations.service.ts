import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import {
  calculatePerformanceScore,
  deriveProviderAvailability,
  type ProviderAvailability,
  type PerformanceResult,
} from "@/services/performance-engine.service";

export interface ProviderOperationsProfile {
  providerId: string;
  availability: ProviderAvailability;
  performance: PerformanceResult;
  earnings: {
    total: number;
    monthly: number;
  };
  jobs: {
    completed: number;
    cancelled: number;
    total: number;
    acceptanceRate: number;
    cancellationRate: number;
  };
  referralsMade: number;
  recentActivities: {
    id: string;
    type: string;
    description: string;
    timestamp: Date;
  }[];
}

export async function getProviderOperationsProfile(
  providerId: string
): Promise<ProviderOperationsProfile | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      user: {
        select: {
          id: true,
          status: true,
          _count: { select: { referralsMade: true } },
        },
      },
      bookings: {
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          completedAt: true,
          bookingNumber: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          message: true,
          createdAt: true,
        },
      },
    },
  });

  if (!provider) return null;

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const completed = provider.bookings.filter((b) => b.status === "COMPLETED");
  const cancelled = provider.bookings.filter((b) => b.status === "CANCELLED");
  const total = provider.bookings.length;
  const accepted = provider.bookings.filter((b) =>
    ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(b.status)
  ).length;

  const totalEarnings = completed.reduce((s, b) => s + b.amount, 0);
  const monthlyEarnings = completed
    .filter((b) => b.completedAt && b.completedAt >= monthStart && b.completedAt <= monthEnd)
    .reduce((s, b) => s + b.amount, 0);

  const acceptanceRate = total > 0 ? accepted / total : 0;
  const cancellationRate = total > 0 ? cancelled.length / total : 0;

  const performance = calculatePerformanceScore({
    rating: provider.rating,
    completedJobs: provider.completedJobs,
    totalReviews: provider.totalReviews,
    acceptanceRate,
    cancellationRate,
    avgResponseMinutes: 45,
  });

  const availability = deriveProviderAvailability({
    status: provider.status,
    isVerified: provider.isVerified,
    canReceiveBookings: provider.canReceiveBookings,
    userStatus: provider.user.status,
  });

  const bookingActivities = provider.bookings.slice(0, 5).map((b) => ({
    id: b.id,
    type: "BOOKING",
    description: `${b.bookingNumber} — ${b.status}`,
    timestamp: b.createdAt,
  }));

  const verificationActivities = provider.messages.map((m) => ({
    id: m.id,
    type: "VERIFICATION",
    description: m.message.slice(0, 80),
    timestamp: m.createdAt,
  }));

  const recentActivities = [...bookingActivities, ...verificationActivities]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  return {
    providerId,
    availability,
    performance,
    earnings: {
      total: totalEarnings,
      monthly: monthlyEarnings,
    },
    jobs: {
      completed: completed.length,
      cancelled: cancelled.length,
      total,
      acceptanceRate,
      cancellationRate,
    },
    referralsMade: provider.user._count.referralsMade,
    recentActivities,
  };
}

export async function getProviderOperationsBatch(providerIds: string[]) {
  const profiles = await Promise.all(
    providerIds.map((id) => getProviderOperationsProfile(id))
  );
  return Object.fromEntries(
    providerIds.map((id, i) => [id, profiles[i]])
  ) as Record<string, ProviderOperationsProfile | null>;
}
