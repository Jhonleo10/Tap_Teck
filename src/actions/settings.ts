"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { syncServiceCatalog } from "@/lib/sync-catalog";

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

export async function syncCatalogFromSource() {
  await syncServiceCatalog(prisma);
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

export async function createPlatformService(params: {
  categoryId: string;
  title: string;
  description?: string;
}) {
  const max = await prisma.platformService.aggregate({ _max: { catalogId: true } });
  const catalogId = (max._max.catalogId ?? 0) + 1;

  const service = await prisma.platformService.create({
    data: {
      catalogId,
      title: params.title.trim(),
      description: params.description?.trim(),
      categoryId: params.categoryId,
      isActive: true,
    },
    include: { subServices: true },
  });

  revalidatePath("/settings");
  return service;
}

export async function createSubService(params: { serviceId: string; name: string }) {
  const sub = await prisma.subService.create({
    data: {
      serviceId: params.serviceId,
      name: params.name.trim(),
    },
  });
  revalidatePath("/settings");
  return sub;
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
