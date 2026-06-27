import type { ProviderStatus, UserStatus } from "@prisma/client";

export type ProviderAvailability =
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "ON_LEAVE"
  | "SUSPENDED";

export type PerformanceTier =
  | "ELITE"
  | "EXCELLENT"
  | "GOOD"
  | "NEEDS_IMPROVEMENT"
  | "POOR";

export interface PerformanceInput {
  rating: number;
  completedJobs: number;
  totalReviews: number;
  acceptanceRate: number;
  cancellationRate: number;
  avgResponseMinutes: number;
}

export interface PerformanceResult {
  score: number;
  tier: PerformanceTier;
  breakdown: {
    rating: number;
    completedJobs: number;
    acceptanceRate: number;
    responseTime: number;
    reviewCount: number;
  };
}

const TIER_THRESHOLDS: { min: number; tier: PerformanceTier }[] = [
  { min: 90, tier: "ELITE" },
  { min: 75, tier: "EXCELLENT" },
  { min: 60, tier: "GOOD" },
  { min: 40, tier: "NEEDS_IMPROVEMENT" },
  { min: 0, tier: "POOR" },
];

/** Derive availability from existing provider + user status (no schema change). */
export function deriveProviderAvailability(input: {
  status: ProviderStatus;
  isVerified: boolean;
  canReceiveBookings: boolean;
  userStatus: UserStatus;
}): ProviderAvailability {
  if (input.userStatus === "SUSPENDED") return "SUSPENDED";
  if (input.status === "INACTIVE") return "OFFLINE";
  if (!input.isVerified || input.status === "PENDING") return "ON_LEAVE";
  if (input.status === "ACTIVE" && input.canReceiveBookings) return "ONLINE";
  if (input.status === "ACTIVE") return "BUSY";
  return "OFFLINE";
}

/**
 * Performance formula (spec):
 * 40% rating, 25% completed jobs, 15% acceptance, 10% response time, 10% review count
 */
export function calculatePerformanceScore(input: PerformanceInput): PerformanceResult {
  const ratingScore = Math.min(100, (input.rating / 5) * 100);
  const jobsScore = Math.min(100, (input.completedJobs / 50) * 100);
  const acceptanceScore = Math.min(100, input.acceptanceRate * 100);
  const responseScore = Math.max(0, 100 - Math.min(100, input.avgResponseMinutes / 3));
  const reviewScore = Math.min(100, (input.totalReviews / 30) * 100);

  const score = Math.round(
    ratingScore * 0.4 +
      jobsScore * 0.25 +
      acceptanceScore * 0.15 +
      responseScore * 0.1 +
      reviewScore * 0.1
  );

  const tier =
    TIER_THRESHOLDS.find((t) => score >= t.min)?.tier ?? "POOR";

  return {
    score,
    tier,
    breakdown: {
      rating: Math.round(ratingScore),
      completedJobs: Math.round(jobsScore),
      acceptanceRate: Math.round(acceptanceScore),
      responseTime: Math.round(responseScore),
      reviewCount: Math.round(reviewScore),
    },
  };
}

export function tierLabel(tier: PerformanceTier): string {
  return tier.replace(/_/g, " ");
}
