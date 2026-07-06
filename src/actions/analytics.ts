"use server";

import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  resolveLocationCities,
  type CountryCode,
} from "@/lib/countries";
import {
  getCountryServiceTitles,
  getCountrySubServiceOptions,
} from "@/lib/catalog";

type Period = "day" | "week" | "month" | "year";

function getDateRange(period: Period) {
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

export async function getAnalyticsData(
  period: Period = "month",
  service?: string,
  location?: string,
  country = "india",
  subService?: string
) {
  const dateRange = getDateRange(period);
  const countryServices = getCountryServiceTitles(country as CountryCode);
  const locationWhere = location
    ? (() => {
        const cities = resolveLocationCities(country as CountryCode, location);
        return cities.length === 1 ? { location: cities[0] } : { location: { in: cities } };
      })()
    : {};

  const resolvedService = service && service !== "all" ? service : undefined;
  const resolvedSubService = subService && subService !== "all" ? subService : undefined;

  const where = {
    status: "COMPLETED" as const,
    country,
    completedAt: dateRange,
    ...(resolvedService ? { serviceName: resolvedService } : {}),
    ...(resolvedSubService ? { subServiceName: resolvedSubService } : {}),
    ...locationWhere,
    ...(countryServices.length && !resolvedService
      ? { serviceName: { in: countryServices } }
      : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      amount: true,
      serviceName: true,
      subServiceName: true,
      serviceCategory: true,
      location: true,
      completedAt: true,
    },
  });

  const revenueByService: Record<string, number> = {};
  const revenueBySubService: Record<string, number> = {};
  const revenueByLocation: Record<string, number> = {};
  const revenueByCategory: Record<string, number> = {};
  const trendByDate: Record<string, number> = {};

  bookings.forEach((b) => {
    revenueByService[b.serviceName] = (revenueByService[b.serviceName] ?? 0) + b.amount;
    const subKey = b.subServiceName ?? b.serviceName;
    revenueBySubService[subKey] = (revenueBySubService[subKey] ?? 0) + b.amount;
    revenueByLocation[b.location] = (revenueByLocation[b.location] ?? 0) + b.amount;
    revenueByCategory[b.serviceCategory] =
      (revenueByCategory[b.serviceCategory] ?? 0) + b.amount;
    if (b.completedAt) {
      const key = b.completedAt.toISOString().split("T")[0];
      trendByDate[key] = (trendByDate[key] ?? 0) + b.amount;
    }
  });

  const topServices = Object.entries(revenueByService)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, revenue]) => ({ name, revenue }));

  return {
    revenueByService: Object.entries(revenueByService).map(([name, revenue]) => ({
      name,
      revenue,
    })),
    revenueBySubService: Object.entries(revenueBySubService)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    revenueByLocation: Object.entries(revenueByLocation).map(([name, revenue]) => ({
      name,
      revenue,
    })),
    revenueByCategory: Object.entries(revenueByCategory).map(([name, revenue]) => ({
      name,
      revenue,
    })),
    revenueTrend: Object.entries(trendByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue })),
    topServices,
    totalRevenue: bookings.reduce((sum, b) => sum + b.amount, 0),
    totalBookings: bookings.length,
  };
}

export async function getFilterOptions(country = "india") {
  const code = country as CountryCode;
  const serviceTitles = getCountryServiceTitles(code);
  const subServices = getCountrySubServiceOptions(code);
  const locations = await prisma.booking.findMany({
    where: { country },
    select: { location: true },
    distinct: ["location"],
  });

  return {
    services: serviceTitles,
    subServices,
    locations: locations.map((l) => l.location),
  };
}
