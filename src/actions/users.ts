"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { UserStatus } from "@prisma/client";

export interface UserFilters {
  search?: string;
  status?: UserStatus | "ALL";
  activity?: "ALL" | "WITH_BOOKINGS" | "NO_BOOKINGS";
}

export async function getUsers(filters: UserFilters = {}) {
  const { search, status, activity } = filters;

  return prisma.user.findMany({
    where: {
      role: "USER",
      ...(status && status !== "ALL" ? { status } : {}),
      ...(activity === "WITH_BOOKINGS"
        ? { bookings: { some: {} } }
        : activity === "NO_BOOKINGS"
          ? { bookings: { none: {} } }
          : {}),
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { referralCode: { contains: search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      referralCode: true,
      emailVerified: true,
      image: true,
      referredById: true,
      _count: { select: { bookings: true, reviews: true } },
    },
    take: 500,
  });
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });
  revalidatePath("/users");
  return { success: true };
}
