"use server";

import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
} from "date-fns";
import {
  getCountryServiceNames,
  getCountryCategories,
  getCountryLocationOptions,
  resolveLocationCities,
  type CountryCode,
} from "@/lib/countries";
import { getCategoryLabel, type ServiceCategoryId } from "@/lib/services-data";

export type DashboardPeriod = "day" | "week" | "month" | "year";

export interface DashboardFilters {
  country: string;
  period?: DashboardPeriod;
  service?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}

function getDateRange(period: DashboardPeriod) {
  const now = new Date();
  switch (period) {
    case "day":
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case "week":
      return { gte: startOfWeek(now), lte: endOfWeek(now) };
    case "month":
      return { gte: startOfMonth(now), lte: endOfMonth(now) };
    case "year":
      return { gte: startOfYear(now), lte: endOfYear(now) };
  }
}

function getTrendDays(period: DashboardPeriod): number {
  switch (period) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    case "year":
      return 365;
  }
}

function buildLocationWhere(country: string, location?: string) {
  if (!location) return {};
  const cities = resolveLocationCities(country as CountryCode, location);
  if (cities.length === 1) return { location: cities[0] };
  return { location: { in: cities } };
}

function buildBookingWhere(filters: DashboardFilters, dateField: "completedAt" | "createdAt" = "completedAt") {
  const period = filters.period ?? "month";
  let dateRange = getDateRange(period);

  if (filters.dateFrom) {
    dateRange = {
      gte: startOfDay(new Date(filters.dateFrom)),
      lte: filters.dateTo
        ? endOfDay(new Date(filters.dateTo))
        : endOfDay(new Date(filters.dateFrom)),
    };
  }

  return {
    country: filters.country,
    ...(filters.service ? { serviceName: filters.service } : {}),
    ...buildLocationWhere(filters.country, filters.location),
    ...(dateField === "completedAt"
      ? { status: "COMPLETED" as const, completedAt: dateRange }
      : { createdAt: dateRange }),
  };
}

export async function getDashboardData(filters: DashboardFilters) {
  const country = filters.country;
  const period = filters.period ?? "month";
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const countryServices = getCountryServiceNames(country as Parameters<typeof getCountryServiceNames>[0]);
  const serviceFilter = countryServices.length
    ? { serviceName: { in: countryServices } }
    : {};

  const baseCountryWhere = { country, ...serviceFilter };
  const locationWhere = buildLocationWhere(country, filters.location);
  const activeBookingWhere = {
    country,
    status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] as BookingStatus[] },
    ...(filters.service ? { serviceName: filters.service } : serviceFilter),
    ...locationWhere,
  };

  const [
    totalUsers,
    totalProviders,
    pendingVerification,
    activeBookings,
    revenueToday,
    revenueMonth,
    recentBookings,
    trendBookings,
    statusBookings,
    categoryBookings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.provider.count({
      where: {
        status: "ACTIVE",
        country,
        ...(filters.service || filters.location
          ? {
              bookings: {
                some: {
                  ...(filters.service ? { serviceName: filters.service } : {}),
                  ...buildLocationWhere(country, filters.location),
                },
              },
            }
          : {}),
      },
    }),
    prisma.provider.count({
      where: {
        country,
        OR: [
          { verificationStatus: "PENDING" },
          { verificationStatus: "UNDER_REVIEW" },
        ],
      },
    }),
    prisma.booking.count({ where: activeBookingWhere }),
    prisma.booking.aggregate({
      where: {
        ...baseCountryWhere,
        status: "COMPLETED",
        completedAt: { gte: todayStart, lte: todayEnd },
        ...(filters.service ? { serviceName: filters.service } : {}),
        ...locationWhere,
      },
      _sum: { amount: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...baseCountryWhere,
        status: "COMPLETED",
        completedAt: { gte: monthStart },
        ...(filters.service ? { serviceName: filters.service } : {}),
        ...locationWhere,
      },
      _sum: { amount: true },
    }),
    prisma.booking.findMany({
      where: {
        country,
        ...(filters.service ? { serviceName: filters.service } : {}),
        ...locationWhere,
        ...(countryServices.length ? { serviceName: { in: countryServices } } : {}),
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        provider: { select: { businessName: true } },
      },
    }),
    prisma.booking.findMany({
      where: buildBookingWhere(filters),
      select: { amount: true, completedAt: true },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: {
        country,
        ...(filters.service ? { serviceName: filters.service } : serviceFilter),
        ...locationWhere,
      },
      _count: { status: true },
    }),
    prisma.booking.findMany({
      where: buildBookingWhere(filters),
      select: { serviceCategory: true, amount: true },
    }),
  ]);

  const trendDays = getTrendDays(period);
  const trendStart = subDays(today, trendDays);
  const groupedTrend: Record<string, number> = {};

  trendBookings.forEach((b) => {
    if (!b.completedAt) return;
    const key =
      period === "year"
        ? b.completedAt.toISOString().slice(0, 7)
        : b.completedAt.toISOString().split("T")[0];
    groupedTrend[key] = (groupedTrend[key] ?? 0) + b.amount;
  });

  if (period === "year" && Object.keys(groupedTrend).length === 0) {
    const yearBookings = await prisma.booking.findMany({
      where: {
        ...buildBookingWhere(filters),
        completedAt: { gte: startOfYear(today), lte: endOfYear(today) },
      },
      select: { amount: true, completedAt: true },
    });
    yearBookings.forEach((b) => {
      if (!b.completedAt) return;
      const key = b.completedAt.toISOString().slice(0, 7);
      groupedTrend[key] = (groupedTrend[key] ?? 0) + b.amount;
    });
  }

  const categoryGrouped: Record<string, number> = {};
  categoryBookings.forEach((b) => {
    const label =
      getCategoryLabel(b.serviceCategory as Exclude<ServiceCategoryId, "all">) ||
      b.serviceCategory;
    categoryGrouped[label] = (categoryGrouped[label] ?? 0) + b.amount;
  });

  const serviceBreakdown: Record<string, number> = {};
  const serviceBookings = await prisma.booking.findMany({
    where: buildBookingWhere(filters),
    select: { serviceName: true, amount: true },
  });
  serviceBookings.forEach((b) => {
    serviceBreakdown[b.serviceName] = (serviceBreakdown[b.serviceName] ?? 0) + b.amount;
  });

  return {
    stats: {
      totalUsers,
      totalProviders,
      pendingVerification,
      activeBookings,
      revenueToday: revenueToday._sum.amount ?? 0,
      revenueMonth: revenueMonth._sum.amount ?? 0,
    },
    recentBookings,
    revenueTrend: Object.entries(groupedTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue })),
    bookingStatus: statusBookings.map((s) => ({
      name: s.status.replace("_", " "),
      value: s._count.status,
    })),
    categoryRevenue: Object.entries(categoryGrouped)
      .sort(([, a], [, b]) => b - a)
      .map(([name, revenue]) => ({ name, revenue })),
    serviceRevenue: Object.entries(serviceBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, revenue]) => ({ name, revenue })),
    filterOptions: {
      services: getCountryServiceNames(country as Parameters<typeof getCountryServiceNames>[0]),
      locations: getCountryLocationOptions(country as CountryCode).map((o) => o.value),
      categories: getCountryCategories(country as Parameters<typeof getCountryCategories>[0]).map(
        (c) => c.label
      ),
    },
  };
}

export async function getDashboardLocations(country: string) {
  return getCountryLocationOptions(country as CountryCode).map((o) => o.value);
}

// Legacy exports for backwards compatibility
export async function getDashboardStats(country = "india") {
  const data = await getDashboardData({ country });
  return data.stats;
}

export async function getRecentBookings(limit = 5, country = "india") {
  return prisma.booking.findMany({
    where: { country },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      provider: { select: { businessName: true } },
    },
  });
}

export async function getRevenueTrend(days = 7, country = "india") {
  const bookings = await prisma.booking.findMany({
    where: {
      country,
      status: "COMPLETED",
      completedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    },
    select: { amount: true, completedAt: true },
  });

  const grouped: Record<string, number> = {};
  bookings.forEach((b) => {
    if (!b.completedAt) return;
    const key = b.completedAt.toISOString().split("T")[0];
    grouped[key] = (grouped[key] ?? 0) + b.amount;
  });

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

export async function getBookingStatusBreakdown(country = "india") {
  const statuses = await prisma.booking.groupBy({
    by: ["status"],
    where: { country },
    _count: { status: true },
  });

  return statuses.map((s) => ({
    name: s.status.replace("_", " "),
    value: s._count.status,
  }));
}

export async function getCategoryRevenue(country = "india") {
  const bookings = await prisma.booking.findMany({
    where: { country, status: "COMPLETED" },
    select: { serviceCategory: true, amount: true },
  });

  const grouped: Record<string, number> = {};
  bookings.forEach((b) => {
    grouped[b.serviceCategory] = (grouped[b.serviceCategory] ?? 0) + b.amount;
  });

  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .map(([name, revenue]) => ({ name, revenue }));
}
