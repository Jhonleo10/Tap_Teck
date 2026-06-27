import type {
  AIProvider,
  AIProviderContext,
  AIInsight,
  AIRecommendation,
  AIAlert,
  PredictionItem,
} from "@/lib/ai/types";
import { AI_THRESHOLDS } from "@/lib/ai/thresholds";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export class RuleBasedProvider implements AIProvider {
  readonly name = "rule-based";

  isAvailable() {
    return true;
  }

  generateInsights(ctx: AIProviderContext): AIInsight[] {
    const { analytics: a } = ctx;
    const insights: AIInsight[] = [];

    const revChange = pctChange(a.today.revenue, a.yesterday.revenue);
    if (revChange !== 0) {
      insights.push({
        id: "revenue-today",
        category: "REVENUE",
        title: revChange > 0 ? "Revenue increased today" : "Revenue decreased today",
        description: `Today's completed revenue is ₹${Math.round(a.today.revenue).toLocaleString()} vs yesterday ₹${Math.round(a.yesterday.revenue).toLocaleString()}.`,
        metric: `${revChange > 0 ? "+" : ""}${revChange}%`,
        changePercent: revChange,
        trend: revChange > 0 ? "up" : revChange < 0 ? "down" : "stable",
        href: "/analytics?period=day",
      });
    }

    const bookChange = pctChange(a.today.bookings, a.yesterday.bookings);
    if (bookChange !== 0) {
      insights.push({
        id: "bookings-today",
        category: "BOOKINGS",
        title: bookChange > 0 ? "Bookings increased today" : "Bookings decreased today",
        description: `${a.today.bookings} bookings today compared to ${a.yesterday.bookings} yesterday.`,
        metric: `${bookChange > 0 ? "+" : ""}${bookChange}%`,
        changePercent: bookChange,
        trend: bookChange > 0 ? "up" : "down",
        href: "/bookings",
      });
    }

    if (a.trendingService) {
      insights.push({
        id: "trending-service",
        category: "TREND",
        title: `${a.trendingService.name} is trending`,
        description: `Bookings for this service grew ${a.trendingService.growthPercent}% week-over-week.`,
        metric: `${a.trendingService.count} bookings`,
        trend: "up",
        href: `/bookings`,
      });
    }

    if (a.pendingVerification > 0) {
      insights.push({
        id: "pending-verification",
        category: "OPERATIONS",
        title: `${a.pendingVerification} providers require verification`,
        description: "Approving verified providers reduces booking assignment delays.",
        metric: String(a.pendingVerification),
        href: "/verification",
      });
    }

    if (a.satisfactionChange !== 0) {
      insights.push({
        id: "satisfaction",
        category: "SATISFACTION",
        title:
          a.satisfactionChange > 0
            ? "Customer satisfaction increased"
            : "Customer satisfaction declined",
        description: `Platform average rating is now ${a.reviews.averageRating}★ across ${a.reviews.total} reviews.`,
        metric: `${a.satisfactionChange > 0 ? "+" : ""}${a.satisfactionChange.toFixed(1)}★`,
        trend: a.satisfactionChange > 0 ? "up" : "down",
        href: "/bookings",
      });
    }

    if (a.referralGrowthWeek > 0) {
      insights.push({
        id: "referral-growth",
        category: "REFERRAL",
        title: "Referral registrations increased",
        description: `${a.referralGrowthWeek} new referrals this week.`,
        metric: `+${a.referralGrowthWeek}`,
        trend: "up",
        href: "/referrals",
      });
    }

    if (a.topCity) {
      insights.push({
        id: "top-city",
        category: "REVENUE",
        title: "Highest revenue city",
        description: `${a.topCity.name} leads with ₹${Math.round(a.topCity.revenue).toLocaleString()} in completed revenue.`,
        metric: a.topCity.name,
        href: "/analytics",
      });
    }

    if (a.fastestCategory) {
      insights.push({
        id: "fastest-category",
        category: "GROWTH",
        title: "Fastest growing category",
        description: `${a.fastestCategory.name} bookings grew ${a.fastestCategory.growthPercent}% this month.`,
        metric: `+${a.fastestCategory.growthPercent}%`,
        trend: "up",
        href: "/analytics",
      });
    }

    if (a.topProvider) {
      insights.push({
        id: "top-provider",
        category: "PROVIDER",
        title: "Highest performing provider",
        description: `${a.topProvider.name} completed ${a.topProvider.completedJobs} jobs with ${a.topProvider.rating.toFixed(1)}★ rating.`,
        metric: a.topProvider.name,
        href: "/providers",
      });
    }

    if (a.cancellationRate >= AI_THRESHOLDS.cancellationRateWarning) {
      insights.push({
        id: "cancellation-rate",
        category: "OPERATIONS",
        title: "Elevated cancellation rate",
        description: `Platform cancellation rate is ${Math.round(a.cancellationRate * 100)}% this period.`,
        metric: `${Math.round(a.cancellationRate * 100)}%`,
        trend: "down",
        href: "/bookings",
      });
    }

    if (insights.length === 0) {
      insights.push(
        {
          id: "platform-active",
          category: "OPERATIONS",
          title: "Platform monitoring active",
          description: `TapTeck AI is analyzing ${a.country} marketplace data. Insights will populate as bookings and reviews grow.`,
          href: "/dashboard",
        },
        {
          id: "health-baseline",
          category: "SATISFACTION",
          title: "Customer satisfaction baseline",
          description: `Platform average rating is ${a.reviews.averageRating}★ across ${a.reviews.total} reviews.`,
          metric: `${a.reviews.averageRating}★`,
          href: "/bookings",
        }
      );
    }

    return insights;
  }

  generateRecommendations(ctx: AIProviderContext): AIRecommendation[] {
    const { analytics: a } = ctx;
    const recs: AIRecommendation[] = [];

    if (a.pendingVerification >= AI_THRESHOLDS.pendingVerificationWarning) {
      recs.push({
        id: "approve-providers",
        title: `Approve ${a.pendingVerification} pending providers`,
        description: "Reduce booking assignment delays by clearing the verification queue.",
        priority: a.pendingVerification >= AI_THRESHOLDS.pendingVerificationCritical ? "HIGH" : "MEDIUM",
        actionLabel: "Open verification",
        href: "/verification",
        rationale: `Queue exceeds ${AI_THRESHOLDS.pendingVerificationWarning} provider threshold.`,
      });
    }

    if (a.trendingService && a.trendingService.growthPercent >= AI_THRESHOLDS.bookingGrowthPositive) {
      recs.push({
        id: "trending-demand",
        title: `${a.trendingService.name} demand is increasing`,
        description: "Consider onboarding more providers in this category.",
        priority: "MEDIUM",
        actionLabel: "View providers",
        href: "/providers",
        rationale: `Week-over-week growth of ${a.trendingService.growthPercent}%.`,
      });
    }

    if (a.topCityDemand) {
      recs.push({
        id: "city-availability",
        title: `Increase provider availability in ${a.topCityDemand.city}`,
        description: `${a.topCityDemand.unmetBookings} pending bookings in this location.`,
        priority: "HIGH",
        actionLabel: "View bookings",
        href: "/bookings",
        rationale: "High pending booking concentration detected.",
      });
    }

    if (a.topProvider) {
      recs.push({
        id: "reward-top-provider",
        title: `Reward ${a.topProvider.name} for outstanding performance`,
        description: `${a.topProvider.completedJobs} completed jobs with ${a.topProvider.rating.toFixed(1)}★ rating.`,
        priority: "LOW",
        actionLabel: "Assign reward",
        href: "/referrals",
        rationale: "Top performer recognition improves retention.",
      });
    }

    const risky = a.providersAtRisk.slice(0, 3);
    risky.forEach((p) => {
      recs.push({
        id: `investigate-${p.id}`,
        title: `Investigate ${p.businessName} for repeated cancellations`,
        description: `Cancellation rate ${Math.round(p.cancellationRate * 100)}% with ${p.rating.toFixed(1)}★ rating.`,
        priority: "HIGH",
        actionLabel: "View provider",
        href: "/providers",
        rationale: `Exceeds ${AI_THRESHOLDS.providerAtRiskCancellationRate}% cancellation threshold.`,
      });
    });

    if (a.recentOneStarReviews > 0) {
      recs.push({
        id: "follow-one-star",
        title: `Follow up on ${a.recentOneStarReviews} recent one-star reviews`,
        description: "Address negative feedback to protect platform reputation.",
        priority: "HIGH",
        actionLabel: "View reviews",
        href: "/bookings",
        rationale: "Recent low ratings require admin attention.",
      });
    }

    if (a.pendingReviews > 10) {
      recs.push({
        id: "review-backlog",
        title: "Encourage customers to complete reviews",
        description: `${a.pendingReviews} completed bookings lack reviews.`,
        priority: "MEDIUM",
        actionLabel: "View bookings",
        href: "/bookings",
        rationale: "Review backlog affects satisfaction metrics.",
      });
    }

    return recs;
  }

  generateAlerts(ctx: AIProviderContext): AIAlert[] {
    const { analytics: a } = ctx;
    const alerts: AIAlert[] = [];

    if (a.pendingVerification >= AI_THRESHOLDS.pendingVerificationCritical) {
      alerts.push({
        id: "alert-verification-queue",
        severity: "CRITICAL",
        title: "Verification queue exceeds threshold",
        description: `${a.pendingVerification} providers awaiting review.`,
        href: "/verification",
      });
    } else if (a.pendingVerification >= AI_THRESHOLDS.pendingVerificationWarning) {
      alerts.push({
        id: "alert-verification-queue",
        severity: "WARNING",
        title: "Verification queue growing",
        description: `${a.pendingVerification} providers pending verification.`,
        href: "/verification",
      });
    }

    if (a.avgResponseTimeMinutes >= AI_THRESHOLDS.responseTimeCriticalMinutes) {
      alerts.push({
        id: "alert-response-time",
        severity: "CRITICAL",
        title: "Provider response time increased",
        description: `Average response time is ${a.avgResponseTimeMinutes} minutes.`,
        href: "/providers",
      });
    } else if (a.avgResponseTimeMinutes >= AI_THRESHOLDS.responseTimeWarningMinutes) {
      alerts.push({
        id: "alert-response-time",
        severity: "WARNING",
        title: "Response time above target",
        description: `Average response time is ${a.avgResponseTimeMinutes} minutes.`,
        href: "/providers",
      });
    }

    if (a.cancellationRate * 100 >= AI_THRESHOLDS.cancellationRateCritical) {
      alerts.push({
        id: "alert-cancellation",
        severity: "CRITICAL",
        title: "Booking cancellation rate critical",
        description: `${Math.round(a.cancellationRate * 100)}% of bookings were cancelled.`,
        href: "/bookings",
      });
    } else if (a.cancellationRate * 100 >= AI_THRESHOLDS.cancellationRateWarning) {
      alerts.push({
        id: "alert-cancellation",
        severity: "WARNING",
        title: "Cancellation rate elevated",
        description: `${Math.round(a.cancellationRate * 100)}% cancellation rate detected.`,
        href: "/bookings",
      });
    }

    if (a.recentNegativeReviews >= AI_THRESHOLDS.negativeReviewSpike) {
      alerts.push({
        id: "alert-negative-reviews",
        severity: "WARNING",
        title: "Negative reviews increasing",
        description: `${a.recentNegativeReviews} low ratings in the last 7 days.`,
        href: "/bookings",
      });
    }

    const revChange = pctChange(a.today.revenue, a.yesterday.revenue);
    if (revChange <= AI_THRESHOLDS.revenueGrowthNegative && a.yesterday.revenue > 0) {
      alerts.push({
        id: "alert-revenue-drop",
        severity: "WARNING",
        title: "Revenue decreased compared to yesterday",
        description: `Down ${Math.abs(revChange)}% from yesterday's completed revenue.`,
        href: "/analytics?period=day",
      });
    }

    if (a.notificationBacklog > 100) {
      alerts.push({
        id: "alert-notifications",
        severity: "INFO",
        title: "Notification backlog detected",
        description: `${a.notificationBacklog} unread notifications in the system.`,
        href: "/notifications",
      });
    }

    return alerts;
  }

  generatePredictions(ctx: AIProviderContext): PredictionItem[] {
    const { analytics: a } = ctx;
    const predictions: PredictionItem[] = [];
    const T = AI_THRESHOLDS;

    const weeklyAvg = a.week.bookings / 7 || 1;
    const nextWeekBookings = Math.round(weeklyAvg * 7 * (1 + a.bookingGrowthRate / 100));
    predictions.push({
      id: "pred-next-week-bookings",
      title: "Next week's bookings",
      value: `~${nextWeekBookings}`,
      confidence: T.predictionConfidenceMedium,
      description: `Based on ${a.week.bookings} bookings this week with ${a.bookingGrowthRate}% growth trend.`,
    });

    if (a.providerShortageRisk) {
      predictions.push({
        id: "pred-provider-shortage",
        title: "Expected provider shortage",
        value: a.providerShortageRisk.city,
        confidence: T.predictionConfidenceHigh,
        description: `${a.providerShortageRisk.ratio} pending bookings per active provider.`,
      });
    }

    const peakDay = a.peakBookingDays[0];
    if (peakDay) {
      predictions.push({
        id: "pred-peak-day",
        title: "Peak booking day",
        value: peakDay.day,
        confidence: T.predictionConfidenceHigh,
        description: `${peakDay.count} bookings historically on this weekday.`,
      });
    }

    const peakHour = a.peakBookingHours[0];
    if (peakHour) {
      predictions.push({
        id: "pred-peak-hour",
        title: "Peak booking hour",
        value: `${peakHour.hour}:00`,
        confidence: T.predictionConfidenceHigh,
        description: `${peakHour.count} bookings typically created at this hour.`,
      });
    }

    if (a.seasonalGrowth) {
      predictions.push({
        id: "pred-seasonal",
        title: "Seasonal demand",
        value: `${a.seasonalGrowth.direction}`,
        confidence: T.predictionConfidenceMedium,
        description: a.seasonalGrowth.description,
      });
    }

    const forecastRevenue = Math.round(
      a.week.revenue * (1 + a.revenueGrowthRate / 100)
    );
    predictions.push({
      id: "pred-revenue",
      title: "Revenue projection (next week)",
      value: `₹${forecastRevenue.toLocaleString()}`,
      confidence: T.predictionConfidenceMedium,
      description: `Projected from weekly revenue with ${a.revenueGrowthRate}% growth rate.`,
    });

    return predictions;
  }
}
