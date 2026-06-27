"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import { getCountryServiceTitles } from "@/lib/catalog";
import type { CountryCode } from "@/lib/countries";
import type { BookingStatus, Prisma } from "@prisma/client";
import type { ActionResponse } from "@/types/action";

export interface BookingFilters {
  status?: BookingStatus | "ALL";
  country?: string;
  service?: string;
  subService?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const BOOKING_SELECT = {
  id: true,
  bookingNumber: true,
  serviceName: true,
  subServiceName: true,
  location: true,
  amount: true,
  status: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
  provider: { select: { businessName: true } },
  review: {
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BookingSelect;

const BOOKING_SORT_FIELDS = {
  createdAt: true,
  amount: true,
  status: true,
  bookingNumber: true,
} as const;

function buildBookingWhere(filters: BookingFilters = {}): Prisma.BookingWhereInput {
  const { status, country, service, subService, search, dateFrom, dateTo } = filters;
  const countryServices = country
    ? getCountryServiceTitles(country as CountryCode)
    : [];

  return {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(country ? { country } : {}),
    ...(service && service !== "all" ? { serviceName: service } : {}),
    ...(subService && subService !== "all" ? { subServiceName: subService } : {}),
    ...(countryServices.length && !service
      ? { serviceName: { in: countryServices } }
      : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { bookingNumber: { contains: search, mode: "insensitive" } },
            { serviceName: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { provider: { businessName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function getBookings(filters: BookingFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildBookingWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      BOOKING_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: BOOKING_SELECT,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getBookings");
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<ActionResponse> {
  return withAction(async () => {
    const data: { status: BookingStatus; completedAt?: Date } = { status };
    if (status === "COMPLETED") data.completedAt = new Date();

    await prisma.booking.update({
      where: { id: bookingId },
      data,
    });

    if (status === "COMPLETED") {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { providerId: true },
      });
      if (booking) {
        await prisma.provider.update({
          where: { id: booking.providerId },
          data: { completedJobs: { increment: 1 } },
        });
      }
    }

    revalidatePath("/bookings");
    return undefined;
  }, "updateBookingStatus", "Booking status updated");
}
