"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

export async function getSettings() {
  let settings = await prisma.appSettings.findFirst();
  if (!settings) {
    settings = await prisma.appSettings.create({ data: {} });
  }
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      services: {
        orderBy: { catalogId: "asc" },
        include: {
          subServices: { orderBy: { name: "asc" } },
        },
      },
    },
  });
  return { settings, categories };
}

export async function updateCommission(percentage: number) {
  const settings = await prisma.appSettings.findFirst();
  if (settings) {
    await prisma.appSettings.update({
      where: { id: settings.id },
      data: { commissionPercentage: percentage },
    });
  } else {
    await prisma.appSettings.create({
      data: { commissionPercentage: percentage },
    });
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function updateReferralReward(amount: number) {
  const settings = await prisma.appSettings.findFirst();
  if (settings) {
    await prisma.appSettings.update({
      where: { id: settings.id },
      data: { referralRewardAmount: amount },
    });
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function updateGiftRules(rules: Prisma.InputJsonValue) {
  const settings = await prisma.appSettings.findFirst();
  if (settings) {
    await prisma.appSettings.update({
      where: { id: settings.id },
      data: { giftRules: rules },
    });
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function createServiceCategory(name: string, description?: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await prisma.serviceCategory.create({ data: { name, slug, description } });
  revalidatePath("/settings");
  return { success: true };
}

export async function togglePlatformService(id: string, isActive: boolean) {
  await prisma.platformService.update({ where: { id }, data: { isActive } });
  revalidatePath("/settings");
  return { success: true };
}

export async function toggleServiceCategory(id: string, isActive: boolean) {
  await prisma.serviceCategory.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteServiceCategory(id: string) {
  await prisma.serviceCategory.delete({ where: { id } });
  revalidatePath("/settings");
  return { success: true };
}
