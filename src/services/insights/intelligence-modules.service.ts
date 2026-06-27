import type {
  TrendCard,
  DailyBriefing,
  WeeklyReport,
  ReviewAIIntelligence,
  ProviderAIIntelligence,
  CustomerAIIntelligence,
  RevenueAIIntelligence,
  OperationalAIIntelligence,
  ProviderScorecard,
  AIAlert,
} from "@/lib/ai/types";
import { calculatePerformanceScore } from "@/services/performance-engine.service";
import type { AnalyticsSnapshot } from "@/services/analytics/analytics-engine.service";
import { calculateBusinessHealth } from "@/services/insights/business-health.service";
import { prisma } from "@/lib/prisma";
import { subDays, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { getAIProvider } from "@/lib/ai/registry";

const STOP_WORDS = new Set([
  "about", "after", "again", "being", "could", "every", "from", "have",
  "their", "there", "these", "those", "through", "under", "until", "while",
  "would", "service", "provider", "booking",
]);

function extractKeywords(comments: string[], positive: boolean): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  comments.forEach((c) => {
    c.toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
      .forEach((w) => {
        freq[w] = (freq[w] ?? 0) + 1;
      });
  });
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function buildTrendCards(a: AnalyticsSnapshot): TrendCard[] {
  const cards: TrendCard[] = [];

  if (a.trendingService) {
    cards.push({
      id: "trend-service",
      title: "Trending Service",
      description: a.trendingService.name,
      value: `${a.trendingService.count} bookings`,
      changePercent: a.trendingService.growthPercent,
      trend: a.trendingService.growthPercent > 0 ? "up" : "stable",
    });
  }

  if (a.topCity) {
    cards.push({
      id: "trend-location",
      title: "Trending Location",
      description: a.topCity.name,
      value: `₹${Math.round(a.topCity.revenue).toLocaleString()}`,
      trend: "up",
    });
  }

  if (a.peakBookingHours[0]) {
    cards.push({
      id: "trend-peak-hour",
      title: "Peak Booking Hour",
      description: "Highest booking creation activity",
      value: `${a.peakBookingHours[0].hour}:00`,
      trend: "stable",
    });
  }

  if (a.topProvider) {
    cards.push({
      id: "trend-active-provider",
      title: "Most Active Provider",
      description: a.topProvider.name,
      value: `${a.topProvider.completedJobs} jobs`,
      trend: "up",
    });
  }

  if (a.seasonalGrowth) {
    cards.push({
      id: "trend-seasonal",
      title: "Seasonal Growth",
      description: a.seasonalGrowth.description,
      value: a.seasonalGrowth.direction,
      changePercent: a.bookingGrowthRate,
      trend: a.bookingGrowthRate > 0 ? "up" : "down",
    });
  }

  cards.push({
    id: "trend-revenue",
    title: "Revenue Trend",
    description: "Month-over-month completed revenue",
    value: `₹${Math.round(a.month.revenue).toLocaleString()}`,
    changePercent: a.revenueGrowthRate,
    trend: a.revenueGrowthRate > 0 ? "up" : a.revenueGrowthRate < 0 ? "down" : "stable",
  });

  const customerGrowth = a.today.newUsers;
  cards.push({
    id: "trend-customers",
    title: "Customer Growth",
    description: "New users registered today",
    value: String(customerGrowth),
    trend: customerGrowth > 0 ? "up" : "stable",
  });

  return cards;
}

export function buildDailyBriefing(a: AnalyticsSnapshot): DailyBriefing {
  const health = calculateBusinessHealth(a);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning Admin 👋" : hour < 17 ? "Good Afternoon Admin 👋" : "Good Evening Admin 👋";

  return {
    greeting,
    headline: "Today's Business Summary",
    summary: `${a.today.bookings} bookings · ₹${Math.round(a.today.revenue).toLocaleString()} revenue · ${health.tier.replace(/_/g, " ")} platform health`,
    metrics: {
      todayRevenue: a.today.revenue,
      todayBookings: a.today.bookings,
      newUsers: a.today.newUsers,
      newProviders: a.today.newProviders,
      pendingVerification: a.pendingVerification,
      pendingReviews: a.pendingReviews,
      referralGrowth: a.referralGrowthWeek,
      businessHealth: health.tier,
    },
    topServices: a.topServices.slice(0, 3).map((s) => ({ name: s.name, count: s.count })),
    topCities: a.topCities.slice(0, 3).map((c) => ({ name: c.name, count: c.count })),
    topProviders: a.topProviders.slice(0, 3).map((p) => ({
      name: p.name,
      metric: `${p.jobs} jobs · ${p.rating.toFixed(1)}★`,
    })),
  };
}

export async function buildWeeklyReport(a: AnalyticsSnapshot): Promise<WeeklyReport> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const prevWeekStart = startOfWeek(subWeeks(now, 1));
  const prevWeekEnd = endOfWeek(subWeeks(now, 1));

  const [prevWeekRevenue, prevWeekBookings, newCustomers, newProviders, rewardsSum, reviewsWeek] =
    await Promise.all([
      prisma.booking.aggregate({
        where: {
          country: a.country,
          status: "COMPLETED",
          completedAt: { gte: prevWeekStart, lte: prevWeekEnd },
        },
        _sum: { amount: true },
      }),
      prisma.booking.count({
        where: { country: a.country, createdAt: { gte: prevWeekStart, lte: prevWeekEnd } },
      }),
      prisma.user.count({
        where: { role: "USER", createdAt: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.provider.count({
        where: { country: a.country, createdAt: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.reward.aggregate({
        where: { createdAt: { gte: weekStart, lte: weekEnd } },
        _sum: { value: true },
      }),
      prisma.review.aggregate({
        where: {
          provider: { country: a.country },
          createdAt: { gte: weekStart, lte: weekEnd },
        },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

  const prevRev = prevWeekRevenue._sum.amount ?? 0;
  const revGrowth =
    prevRev > 0
      ? Math.round(((a.week.revenue - prevRev) / prevRev) * 100)
      : 0;
  const bookGrowth =
    prevWeekBookings > 0
      ? Math.round(((a.week.bookings - prevWeekBookings) / prevWeekBookings) * 100)
      : 0;

  const provider = getAIProvider();
  const recommendations = provider.generateRecommendations({ country: a.country, analytics: a });

  const positiveWeek = await prisma.review.count({
    where: {
      provider: { country: a.country },
      rating: { gte: 4 },
      createdAt: { gte: weekStart, lte: weekEnd },
    },
  });

  const weeklyServiceStats = await prisma.booking.groupBy({
    by: ["serviceName"],
    where: { country: a.country, createdAt: { gte: weekStart, lte: weekEnd } },
    _count: true,
    _sum: { amount: true },
    orderBy: { _count: { serviceName: "desc" } },
    take: 6,
  });

  const report: WeeklyReport = {
    periodLabel: `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`,
    weeklyRevenue: a.week.revenue,
    weeklyBookings: a.week.bookings,
    revenueGrowthPercent: revGrowth,
    bookingGrowthPercent: bookGrowth,
    customerGrowth: newCustomers,
    providerGrowth: newProviders,
    topServices: weeklyServiceStats.map((s) => ({
      name: s.serviceName,
      revenue: s._sum.amount ?? 0,
      bookings: s._count,
    })),
    topCities: a.topCities.slice(0, 5).map((c) => ({
      name: c.name,
      bookings: c.count,
    })),
    topProviders: a.topProviders.slice(0, 5).map((p) => ({
      name: p.name,
      jobs: p.jobs,
      rating: p.rating,
    })),
    referralGrowth: a.referralGrowthWeek,
    rewardsDistributed: rewardsSum._sum.value ?? 0,
    reviewStats: {
      averageRating: Math.round((reviewsWeek._avg.rating ?? 0) * 10) / 10,
      total: reviewsWeek._count,
      positivePercent:
        reviewsWeek._count > 0 ? Math.round((positiveWeek / reviewsWeek._count) * 100) : 0,
    },
    cancellationRate: a.cancellationRate,
    recommendations,
    exportRows: [],
  };

  report.exportRows = [
    { metric: "Weekly Revenue", value: report.weeklyRevenue },
    { metric: "Weekly Bookings", value: report.weeklyBookings },
    { metric: "Revenue Growth %", value: report.revenueGrowthPercent },
    { metric: "Booking Growth %", value: report.bookingGrowthPercent },
    { metric: "New Customers", value: report.customerGrowth },
    { metric: "New Providers", value: report.providerGrowth },
    { metric: "Referral Growth", value: report.referralGrowth },
    { metric: "Rewards Distributed", value: report.rewardsDistributed },
    { metric: "Avg Rating", value: report.reviewStats.averageRating },
    { metric: "Cancellation Rate", value: Math.round(report.cancellationRate * 100) },
  ];

  return report;
}

export async function buildReviewIntelligence(country: string): Promise<ReviewAIIntelligence> {
  const reviews = await prisma.review.findMany({
    where: { provider: { country } },
    select: { rating: true, comment: true, createdAt: true, provider: { select: { businessName: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const positive = reviews.filter((r) => r.rating >= 4 && r.comment);
  const negative = reviews.filter((r) => r.rating <= 2 && r.comment);

  const monthMap: Record<string, { sum: number; count: number }> = {};
  reviews.forEach((r) => {
    const key = r.createdAt.toLocaleDateString("en", { month: "short", year: "2-digit" });
    if (!monthMap[key]) monthMap[key] = { sum: 0, count: 0 };
    monthMap[key].sum += r.rating;
    monthMap[key].count += 1;
  });

  const providerMap: Record<string, number[]> = {};
  reviews.forEach((r) => {
    const n = r.provider.businessName;
    if (!providerMap[n]) providerMap[n] = [];
    providerMap[n].push(r.rating);
  });

  const lowRated = Object.entries(providerMap)
    .filter(([, ratings]) => ratings.length >= 2)
    .map(([name, ratings]) => ({
      name,
      avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      count: ratings.length,
    }))
    .filter((p) => p.avgRating < 3.5)
    .sort((a, b) => a.avgRating - b.avgRating)
    .slice(0, 5);

  const complaintFreq: Record<string, number> = {};
  negative.forEach((r) => {
    r.comment!.toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .forEach((w) => {
        complaintFreq[w] = (complaintFreq[w] ?? 0) + 1;
      });
  });
  const repeatedComplaints = Object.entries(complaintFreq)
    .filter(([, c]) => c >= 3)
    .map(([word, count]) => `"${word}" mentioned ${count} times`);

  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const posPct = reviews.length > 0 ? Math.round((positive.length / reviews.length) * 100) : 0;

  let sentimentSummary = "Neutral sentiment across recent reviews.";
  if (posPct >= 70) sentimentSummary = "Predominantly positive sentiment — customers are satisfied.";
  else if (posPct < 40) sentimentSummary = "Negative sentiment trending — investigate low ratings.";
  else sentimentSummary = "Mixed sentiment — monitor complaint patterns.";

  return {
    averageRating: Math.round(avg * 10) / 10,
    ratingTrend: Object.entries(monthMap)
      .map(([period, d]) => ({ period, avg: Math.round((d.sum / d.count) * 10) / 10 }))
      .slice(-6),
    positiveKeywords: extractKeywords(positive.map((r) => r.comment!), true),
    negativeKeywords: extractKeywords(negative.map((r) => r.comment!), false),
    repeatedComplaints,
    lowRatedProviders: lowRated,
    sentimentSummary,
  };
}

export async function buildProviderIntelligence(
  a: AnalyticsSnapshot
): Promise<ProviderAIIntelligence> {
  const providers = await prisma.provider.findMany({
    where: { country: a.country, isVerified: true },
    select: {
      id: true,
      businessName: true,
      rating: true,
      completedJobs: true,
      totalReviews: true,
      bookings: { select: { status: true, amount: true } },
    },
    take: 50,
  });

  const scorecards: ProviderScorecard[] = providers.map((p) => {
    const total = p.bookings.length;
    const cancelled = p.bookings.filter((b) => b.status === "CANCELLED").length;
    const perf = calculatePerformanceScore({
      rating: p.rating,
      completedJobs: p.completedJobs,
      totalReviews: p.totalReviews,
      acceptanceRate: total > 0 ? (total - cancelled) / total : 0.8,
      cancellationRate: total > 0 ? cancelled / total : 0,
      avgResponseMinutes: 45,
    });
    const revenue = p.bookings
      .filter((b) => b.status === "COMPLETED")
      .reduce((s, b) => s + b.amount, 0);
    return {
      id: p.id,
      businessName: p.businessName,
      score: perf.score,
      metric: `${p.completedJobs} jobs · ${p.rating.toFixed(1)}★ · ₹${Math.round(revenue).toLocaleString()}`,
      tier: perf.tier,
    };
  });

  const byScore = [...scorecards].sort((a, b) => b.score - a.score);
  const byRevenue = [...scorecards].sort(
    (a, b) =>
      parseInt(b.metric.split("₹")[1]?.replace(/,/g, "") ?? "0") -
      parseInt(a.metric.split("₹")[1]?.replace(/,/g, "") ?? "0")
  );

  const atRisk = a.providersAtRisk.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    score: Math.round((1 - p.cancellationRate) * 100),
    metric: `${Math.round(p.cancellationRate * 100)}% cancel · ${p.rating.toFixed(1)}★`,
    tier: "POOR" as const,
  }));

  return {
    topPerformers: byScore.slice(0, 5),
    mostReliable: byScore.filter((p) => p.score >= 75).slice(0, 5),
    mostImproved: byScore.slice(0, 3),
    highestRevenue: byRevenue.slice(0, 5),
    atRisk,
    slowResponse: byScore.slice(-3).reverse(),
    highCancellation: atRisk.slice(0, 5),
  };
}

export async function buildCustomerIntelligence(
  country: string
): Promise<CustomerAIIntelligence> {
  const users = await prisma.user.findMany({
    where: { role: "USER", bookings: { some: { country } } },
    select: {
      name: true,
      email: true,
      bookings: {
        where: { country },
        select: { amount: true, serviceCategory: true, status: true },
      },
      _count: { select: { referralsMade: true } },
    },
    take: 100,
  });

  const withStats = users.map((u) => ({
    name: u.name ?? u.email,
    bookings: u.bookings.length,
    spent: u.bookings
      .filter((b) => b.status === "COMPLETED")
      .reduce((s, b) => s + b.amount, 0),
    referrals: u._count.referralsMade,
    categories: u.bookings.map((b) => b.serviceCategory),
  }));

  const categoryFreq: Record<string, number> = {};
  withStats.forEach((u) =>
    u.categories.forEach((c) => {
      categoryFreq[c] = (categoryFreq[c] ?? 0) + 1;
    })
  );

  const repeat = withStats.filter((u) => u.bookings >= 2);
  const retentionRate =
    withStats.length > 0 ? Math.round((repeat.length / withStats.length) * 100) / 100 : 0;
  const avgFreq =
    withStats.length > 0
      ? Math.round((withStats.reduce((s, u) => s + u.bookings, 0) / withStats.length) * 10) / 10
      : 0;

  return {
    mostActive: [...withStats].sort((a, b) => b.bookings - a.bookings).slice(0, 5).map((u) => ({
      name: u.name,
      bookings: u.bookings,
    })),
    repeatCustomers: repeat
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5)
      .map((u) => ({ name: u.name, bookings: u.bookings })),
    referralChampions: [...withStats]
      .filter((u) => u.referrals > 0)
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 5)
      .map((u) => ({ name: u.name, referrals: u.referrals })),
    highestSpending: [...withStats]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)
      .map((u) => ({ name: u.name, totalSpent: u.spent })),
    retentionRate,
    avgBookingFrequency: avgFreq,
    favoriteCategories: Object.entries(categoryFreq)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

export function buildRevenueIntelligence(a: AnalyticsSnapshot): RevenueAIIntelligence {
  const completed = a.month.bookings || 1;
  const avgValue = a.month.revenue / Math.max(completed, 1);

  const categoryRevenue = a.fastestCategory
    ? { name: a.fastestCategory.name, revenue: 0 }
    : null;

  return {
    highestCategory: categoryRevenue,
    highestService: a.topServices[0]
      ? { name: a.topServices[0].name, revenue: a.topServices[0].revenue }
      : null,
    highestCity: a.topCity,
    highestProvider: a.topProviders[0]
      ? { name: a.topProviders[0].name, revenue: a.topProviders[0].revenue }
      : null,
    averageBookingValue: Math.round(avgValue),
    revenueForecast: [
      {
        period: "Next Week",
        amount: Math.round(a.week.revenue * (1 + a.revenueGrowthRate / 100)),
        confidence: 65,
      },
      {
        period: "Next Month",
        amount: Math.round(a.month.revenue * (1 + a.revenueGrowthRate / 100)),
        confidence: 55,
      },
    ],
    monthlyGrowthPercent: a.revenueGrowthRate,
    yearlyGrowthPercent: a.revenueGrowthRate,
  };
}

export function buildOperationalIntelligence(
  a: AnalyticsSnapshot,
  alerts: AIAlert[]
): OperationalAIIntelligence {
  return {
    pendingVerification: a.pendingVerification,
    bookingDelays: a.topCityDemand?.unmetBookings ?? 0,
    avgResponseTimeMinutes: a.avgResponseTimeMinutes,
    notificationBacklog: a.notificationBacklog,
    reviewBacklog: a.pendingReviews,
    rewardBacklog: a.rewardBacklog,
    priorityAlerts: alerts.filter((al) => al.severity !== "INFO").slice(0, 6),
  };
}
