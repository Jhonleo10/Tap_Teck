"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { UserStatus } from "@prisma/client";

export async function getUsers(search?: string) {
  return prisma.user.findMany({
    where: {
      role: "USER",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true, reviews: true } },
    },
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
