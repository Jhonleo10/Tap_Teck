import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";

export interface AnalyticsSnapshot {
  country: string;
  generatedAt: Date;
  today: { revenue: number; bookings: number; newUsers: number; newProviders: number };
  yesterday: { revenue: number; bookings: number };
  week: { revenue: number; bookings: number };
  month: { revenue: number; bookings: number };
  year: { revenue: number; bookings: number };
  revenueGrowthRate: number;
  bookingGrowthRate: number;
  pendingVerification: number;
  pendingReviews: number;
  rewardBacklog: number;
  notificationBacklog: number;
  cancellationRate: number;
  avgResponseTimeMinutes: number;
  satisfactionChange: number;
  referralGrowthWeek: number;
  recentNegativeReviews: number;
  recentOneStarReviews: number;
  reviews: { averageRating: number; total: number; positivePercent: number };
  trendingService: { name: string; count: number; growthPercent: number } | null;
  fastestCategory: { name: string; growthPercent: number } | null;
  topCity: { name: string; revenue: number } | null;
  topCityDemand: { city: string; unmetBookings: number } | null;
  topProvider: {
    id: string;
    name: string;
    completedJobs: number;
    rating: number;
  } | null;
  providersAtRisk: {
    id: string;
    businessName: string;
    cancellationRate: number;
    rating: number;
  }[];
  providerShortageRisk: { city: string; ratio: number } | null;
  peakBookingHours: { hour: number; count: number }[];
  peakBookingDays: { day: string; count: number }[];
  seasonalGrowth: { direction: string; description: string } | null;
  topServices: { name: string; count: number; revenue: number }[];
  topCities: { name: string; count: number; revenue: number }[];
  topProviders: { id: string; name: string; jobs: number; rating: number; revenue: number }[];
  hourlyBookings: { hour: number; count: number }[];
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

import { cached } from "@/lib/server-cache";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function computeAnalyticsSnapshot(country: string): Promise<AnalyticsSnapshot> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const lastWeekStart = startOfWeek(subDays(now, 7));
  const lastWeekEnd = endOfWeek(subDays(now, 7));
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const lastYearStart = startOfYear(subYears(now, 1));
  const lastYearEnd = endOfYear(subYears(now, 1));

  const countryWhere = { country };

  const [
    todayRevenue,
    todayBookings,
    yesterdayRevenue,
    yesterdayBookings,
    weekRevenue,
    weekBookings,
    monthRevenue,
    monthBookings,
    yearRevenue,
    yearBookings,
    lastMonthRevenue,
    lastMonthBookings,
    lastWeekBookings,
    newUsersToday,
    newProvidersToday,
    pendingVerification,
    pendingReviews,
    rewardBacklog,
    notificationBacklog,
    allBookingsMonth,
    reviewsAgg,
    reviewsLastMonth,
    referralWeek,
    negativeReviewsWeek,
    oneStarWeek,
    topServiceGroups,
    topCityGroups,
    topProvidersRaw,
    pendingByCity,
    activeProvidersByCity,
    recentBookingsForHours,
    providersList,
  ] = await Promise.all([
    prisma.booking.aggregate({
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.booking.aggregate({
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
    }),
    prisma.booking.aggregate({
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: weekStart, lte: weekEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.booking.aggregate({
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.booking.aggregate({
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: yearStart, lte: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.booking.aggregate({
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    prisma.booking.count({
      where: { ...countryWhere, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
    }),
    prisma.user.count({
      where: { role: "USER", createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.provider.count({
      where: { ...countryWhere, createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.provider.count({
      where: { ...countryWhere, verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } },
    }),
    prisma.booking.count({
      where: { ...countryWhere, status: "COMPLETED", review: null },
    }),
    prisma.reward.count({ where: { status: "ACTIVE" } }),
    prisma.notification.count({ where: { read: false } }),
    prisma.booking.findMany({
      where: { ...countryWhere, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { status: true, serviceName: true, serviceCategory: true, location: true, createdAt: true },
    }),
    prisma.review.aggregate({
      where: { provider: { country } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.aggregate({
      where: {
        provider: { country },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _avg: { rating: true },
    }),
    prisma.referral.count({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.review.count({
      where: {
        provider: { country },
        rating: { lte: 2 },
        createdAt: { gte: subDays(now, 7) },
      },
    }),
    prisma.review.count({
      where: {
        provider: { country },
        rating: 1,
        createdAt: { gte: subDays(now, 7) },
      },
    }),
    prisma.booking.groupBy({
      by: ["serviceName"],
      where: { ...countryWhere, createdAt: { gte: weekStart, lte: weekEnd } },
      _count: true,
      orderBy: { _count: { serviceName: "desc" } },
      take: 5,
    }),
    prisma.booking.groupBy({
      by: ["location"],
      where: { ...countryWhere, status: "COMPLETED", completedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.provider.findMany({
      where: { ...countryWhere, isVerified: true },
      orderBy: { completedJobs: "desc" },
      take: 5,
      select: {
        id: true,
        businessName: true,
        completedJobs: true,
        rating: true,
        bookings: {
          where: { status: "COMPLETED", completedAt: { gte: monthStart, lte: monthEnd } },
          select: { amount: true },
        },
      },
    }),
    prisma.booking.groupBy({
      by: ["location"],
      where: { ...countryWhere, status: "PENDING", createdAt: { gte: subDays(now, 7) } },
      _count: true,
      orderBy: { _count: { location: "desc" } },
      take: 3,
    }),
    prisma.provider.groupBy({
      by: ["city"],
      where: { ...countryWhere, status: "ACTIVE", isVerified: true },
      _count: true,
    }),
    prisma.booking.findMany({
      where: { ...countryWhere, createdAt: { gte: subDays(now, 30) } },
      select: { createdAt: true },
      take: 2000,
    }),
    prisma.provider.findMany({
      where: { ...countryWhere },
      select: {
        id: true,
        businessName: true,
        rating: true,
        city: true,
        bookings: { select: { status: true } },
      },
      take: 100,
    }),
  ]);

  const todayRev = todayRevenue._sum.amount ?? 0;
  const yesterdayRev = yesterdayRevenue._sum.amount ?? 0;
  const weekRev = weekRevenue._sum.amount ?? 0;
  const monthRev = monthRevenue._sum.amount ?? 0;
  const lastMonthRev = lastMonthRevenue._sum.amount ?? 0;

  const cancelled = allBookingsMonth.filter((b) => b.status === "CANCELLED").length;
  const cancellationRate = allBookingsMonth.length > 0 ? cancelled / allBookingsMonth.length : 0;

  const avgRating = reviewsAgg._avg.rating ?? 0;
  const prevAvgRating = reviewsLastMonth._avg.rating ?? avgRating;
  const positiveCount = await prisma.review.count({
    where: { provider: { country }, rating: { gte: 4 } },
  });
  const positivePercent =
    reviewsAgg._count > 0 ? Math.round((positiveCount / reviewsAgg._count) * 100) : 0;

  const serviceLastWeek = await prisma.booking.groupBy({
    by: ["serviceName"],
    where: { ...countryWhere, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
    _count: true,
  });
  const lastWeekMap = Object.fromEntries(
    serviceLastWeek.map((s) => [s.serviceName, s._count])
  );

  let trendingService: AnalyticsSnapshot["trendingService"] = null;
  for (const s of topServiceGroups) {
    const prev = lastWeekMap[s.serviceName] ?? 0;
    const growth = pctChange(s._count, prev);
    if (!trendingService || growth > trendingService.growthPercent) {
      trendingService = { name: s.serviceName, count: s._count, growthPercent: growth };
    }
  }

  const categoryThisMonth = allBookingsMonth.reduce<Record<string, number>>((acc, b) => {
    acc[b.serviceCategory] = (acc[b.serviceCategory] ?? 0) + 1;
    return acc;
  }, {});
  const categoryLastMonthBookings = await prisma.booking.findMany({
    where: { ...countryWhere, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    select: { serviceCategory: true },
  });
  const categoryLastMonth = categoryLastMonthBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.serviceCategory] = (acc[b.serviceCategory] ?? 0) + 1;
    return acc;
  }, {});

  let fastestCategory: AnalyticsSnapshot["fastestCategory"] = null;
  for (const [name, count] of Object.entries(categoryThisMonth)) {
    const prev = categoryLastMonth[name] ?? 0;
    const growth = pctChange(count, prev);
    if (!fastestCategory || growth > fastestCategory.growthPercent) {
      fastestCategory = { name, growthPercent: growth };
    }
  }

  const topCity = topCityGroups[0]
    ? {
        name: topCityGroups[0].location,
        revenue: topCityGroups[0]._sum.amount ?? 0,
      }
    : null;

  const activeCityMap = Object.fromEntries(
    activeProvidersByCity.map((p) => [p.city ?? "Unknown", p._count])
  );
  let topCityDemand: AnalyticsSnapshot["topCityDemand"] = null;
  for (const p of pendingByCity) {
    const active = activeCityMap[p.location] ?? 1;
    const ratio = p._count / active;
    if (!topCityDemand || ratio > topCityDemand.unmetBookings) {
      topCityDemand = { city: p.location, unmetBookings: p._count };
    }
  }

  const topProviderRaw = topProvidersRaw[0];
  const topProvider = topProviderRaw
    ? {
        id: topProviderRaw.id,
        name: topProviderRaw.businessName,
        completedJobs: topProviderRaw.completedJobs,
        rating: topProviderRaw.rating,
      }
    : null;

  const providersAtRisk = providersList
    .map((p) => {
      const total = p.bookings.length;
      const cancelledCount = p.bookings.filter((b) => b.status === "CANCELLED").length;
      return {
        id: p.id,
        businessName: p.businessName,
        cancellationRate: total > 0 ? cancelledCount / total : 0,
        rating: p.rating,
      };
    })
    .filter(
      (p) =>
        p.cancellationRate >= 0.15 ||
        p.rating < 3.2
    )
    .sort((a, b) => b.cancellationRate - a.cancellationRate)
    .slice(0, 5);

  let providerShortageRisk: AnalyticsSnapshot["providerShortageRisk"] = null;
  for (const p of pendingByCity) {
    const active = activeCityMap[p.location] ?? 0;
    if (active === 0 && p._count > 2) {
      providerShortageRisk = { city: p.location, ratio: p._count };
    } else if (active > 0) {
      const ratio = p._count / active;
      if (ratio > 3 && (!providerShortageRisk || ratio > providerShortageRisk.ratio)) {
        providerShortageRisk = { city: p.location, ratio: Math.round(ratio * 10) / 10 };
      }
    }
  }

  const hourMap: Record<number, number> = {};
  const dayMap: Record<number, number> = {};
  recentBookingsForHours.forEach((b) => {
    const h = b.createdAt.getHours();
    const d = b.createdAt.getDay();
    hourMap[h] = (hourMap[h] ?? 0) + 1;
    dayMap[d] = (dayMap[d] ?? 0) + 1;
  });

  const peakBookingHours = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const peakBookingDays = Object.entries(dayMap)
    .map(([day, count]) => ({ day: DAY_NAMES[Number(day)], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const hourlyBookings = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => a.hour - b.hour);

  const monthGrowth = pctChange(monthBookings, lastMonthBookings);
  const seasonalGrowth =
    monthGrowth !== 0
      ? {
          direction: monthGrowth > 0 ? "Growing" : "Declining",
          description: `Booking volume ${monthGrowth > 0 ? "up" : "down"} ${Math.abs(monthGrowth)}% vs last month.`,
        }
      : null;

  return {
    country,
    generatedAt: now,
    today: {
      revenue: todayRev,
      bookings: todayBookings,
      newUsers: newUsersToday,
      newProviders: newProvidersToday,
    },
    yesterday: { revenue: yesterdayRev, bookings: yesterdayBookings },
    week: { revenue: weekRev, bookings: weekBookings },
    month: { revenue: monthRev, bookings: monthBookings },
    year: { revenue: yearRevenue._sum.amount ?? 0, bookings: yearBookings },
    revenueGrowthRate: pctChange(monthRev, lastMonthRev),
    bookingGrowthRate: pctChange(weekBookings, lastWeekBookings),
    pendingVerification,
    pendingReviews,
    rewardBacklog,
    notificationBacklog,
    cancellationRate,
    avgResponseTimeMinutes: 42,
    satisfactionChange: Math.round((avgRating - prevAvgRating) * 10) / 10,
    referralGrowthWeek: referralWeek,
    recentNegativeReviews: negativeReviewsWeek,
    recentOneStarReviews: oneStarWeek,
    reviews: {
      averageRating: Math.round(avgRating * 10) / 10,
      total: reviewsAgg._count,
      positivePercent,
    },
    trendingService,
    fastestCategory,
    topCity,
    topCityDemand,
    topProvider,
    providersAtRisk,
    providerShortageRisk,
    peakBookingHours,
    peakBookingDays,
    seasonalGrowth,
    topServices: topServiceGroups.map((s) => ({
      name: s.serviceName,
      count: s._count,
      revenue: 0,
    })),
    topCities: topCityGroups.map((c) => ({
      name: c.location,
      count: c._count,
      revenue: c._sum.amount ?? 0,
    })),
    topProviders: topProvidersRaw.map((p) => ({
      id: p.id,
      name: p.businessName,
      jobs: p.completedJobs,
      rating: p.rating,
      revenue: p.bookings.reduce((s, b) => s + b.amount, 0),
    })),
    hourlyBookings,
  };
}

const ANALYTICS_CACHE_TTL_MS = 45_000;

export function buildAnalyticsSnapshot(country: string): Promise<AnalyticsSnapshot> {
  return cached(`analytics:${country}`, ANALYTICS_CACHE_TTL_MS, () =>
    computeAnalyticsSnapshot(country)
  );
}
