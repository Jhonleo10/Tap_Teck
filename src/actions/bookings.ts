"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { BookingStatus } from "@prisma/client";

export async function getBookings(status?: BookingStatus | "ALL", country?: string) {
  return prisma.booking.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(country ? { country } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      provider: { select: { businessName: true } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
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
