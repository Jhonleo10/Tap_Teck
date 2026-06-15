"use server";

import { prisma } from "@/lib/prisma";

export async function getReviews(rating?: number | "ALL") {
  return prisma.review.findMany({
    where: rating && rating !== "ALL" ? { rating } : undefined,
    include: {
      user: { select: { name: true, email: true } },
      provider: { select: { businessName: true } },
      booking: { select: { bookingNumber: true, serviceName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
