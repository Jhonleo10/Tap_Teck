import type { BusinessHealthScore, HealthTier } from "@/lib/ai/types";
import { AI_THRESHOLDS } from "@/lib/ai/thresholds";
import type { AnalyticsSnapshot } from "@/services/analytics/analytics-engine.service";

function tierFromScore(score: number): HealthTier {
  if (score >= AI_THRESHOLDS.healthExcellent) return "EXCELLENT";
  if (score >= AI_THRESHOLDS.healthGood) return "GOOD";
  if (score >= AI_THRESHOLDS.healthAverage) return "AVERAGE";
  if (score >= AI_THRESHOLDS.healthNeedsAttention) return "NEEDS_ATTENTION";
  return "POOR";
}

export function calculateBusinessHealth(a: AnalyticsSnapshot): BusinessHealthScore {
  const revenueGrowthScore = Math.min(100, Math.max(0, 50 + a.revenueGrowthRate));
  const bookingGrowthScore = Math.min(100, Math.max(0, 50 + a.bookingGrowthRate));
  const satisfactionScore = Math.min(100, (a.reviews.averageRating / 5) * 100);
  const providerScore = Math.min(
    100,
    a.topProvider ? (a.topProvider.rating / 5) * 100 : 60
  );
  const verificationScore = Math.max(
    0,
    100 - a.pendingVerification * 3
  );
  const reviewScore = a.reviews.positivePercent;
  const cancellationScore = Math.max(0, 100 - a.cancellationRate * 200);

  const metrics = [
    {
      key: "revenue",
      label: "Revenue Growth",
      score: Math.round(revenueGrowthScore),
      weight: 0.2,
      value: `${a.revenueGrowthRate > 0 ? "+" : ""}${a.revenueGrowthRate}%`,
    },
    {
      key: "bookings",
      label: "Booking Growth",
      score: Math.round(bookingGrowthScore),
      weight: 0.15,
      value: `${a.bookingGrowthRate > 0 ? "+" : ""}${a.bookingGrowthRate}%`,
    },
    {
      key: "satisfaction",
      label: "Customer Satisfaction",
      score: Math.round(satisfactionScore),
      weight: 0.2,
      value: `${a.reviews.averageRating}★`,
    },
    {
      key: "providers",
      label: "Provider Performance",
      score: Math.round(providerScore),
      weight: 0.15,
      value: a.topProvider?.name ?? "—",
    },
    {
      key: "verification",
      label: "Verification Speed",
      score: Math.round(verificationScore),
      weight: 0.1,
      value: `${a.pendingVerification} pending`,
    },
    {
      key: "reviews",
      label: "Review Score",
      score: Math.round(reviewScore),
      weight: 0.1,
      value: `${a.reviews.positivePercent}% positive`,
    },
    {
      key: "cancellation",
      label: "Cancellation Rate",
      score: Math.round(cancellationScore),
      weight: 0.1,
      value: `${Math.round(a.cancellationRate * 100)}%`,
    },
  ];

  const score = Math.round(
    metrics.reduce((s, m) => s + m.score * m.weight, 0)
  );

  return { score, tier: tierFromScore(score), metrics };
}
