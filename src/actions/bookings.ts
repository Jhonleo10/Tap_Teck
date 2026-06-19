"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCountryServiceTitles } from "@/lib/catalog";
import type { CountryCode } from "@/lib/countries";
import type { BookingStatus } from "@prisma/client";

export interface BookingFilters {
  status?: BookingStatus | "ALL";
  country?: string;
  service?: string;
  subService?: string;
}

export async function getBookings(filters: BookingFilters = {}) {
  const { status, country, service, subService } = filters;
  const countryServices = country
    ? getCountryServiceTitles(country as CountryCode)
    : [];

  return prisma.booking.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(country ? { country } : {}),
      ...(service && service !== "all" ? { serviceName: service } : {}),
      ...(subService && subService !== "all" ? { subServiceName: subService } : {}),
      ...(countryServices.length && !service
        ? { serviceName: { in: countryServices } }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      provider: { select: { businessName: true } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
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
  return { success: true };
}
