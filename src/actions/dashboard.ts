"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, startOfMonth, endOfDay } from "date-fns";

export async function getDashboardStats() {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);

  const [
    totalUsers,
    totalProviders,
    pendingVerification,
    activeBookings,
    revenueToday,
    revenueMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.provider.count({ where: { status: "ACTIVE" } }),
    prisma.provider.count({
      where: {
        OR: [
          { verificationStatus: "PENDING" },
          { verificationStatus: "UNDER_REVIEW" },
        ],
      },
    }),
    prisma.booking.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] } },
    }),
    prisma.booking.aggregate({
      where: {
        status: "COMPLETED",
        completedAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    }),
    prisma.booking.aggregate({
      where: {
        status: "COMPLETED",
        completedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    totalProviders,
    pendingVerification,
    activeBookings,
    revenueToday: revenueToday._sum.amount ?? 0,
    revenueMonth: revenueMonth._sum.amount ?? 0,
  };
}

export async function getRecentBookings(limit = 5) {
  return prisma.booking.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      provider: { select: { businessName: true } },
    },
  });
}

export async function getRevenueTrend(days = 7) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      completedAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
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

export async function getBookingStatusBreakdown() {
  const statuses = await prisma.booking.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return statuses.map((s) => ({
    name: s.status.replace("_", " "),
    value: s._count.status,
  }));
}

export async function getCategoryRevenue() {
  const bookings = await prisma.booking.findMany({
    where: { status: "COMPLETED" },
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
