"use server";

import { prisma } from "@/lib/prisma";
import { withAction } from "@/lib/action-response";

export async function getProviderPricing(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  service?: string;
  status?: string;
}) {
  return withAction(async () => {
    const { page = 1, pageSize = 20, search, service, status } = params ?? {};
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { provider: { businessName: { contains: search, mode: "insensitive" } } },
        { provider: { user: { name: { contains: search, mode: "insensitive" } } } },
        { serviceName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (service) {
      where.serviceName = service;
    }
    if (status) {
      where.provider = { ...(where.provider as Record<string, unknown> ?? {}), status };
    }

    const [items, total] = await Promise.all([
      prisma.providerServicePrice.findMany({
        where: where as any,
        include: {
          provider: {
            select: {
              id: true,
              businessName: true,
              status: true,
              serviceCategory: true,
              primaryService: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.providerServicePrice.count({ where: where as any }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }, "getProviderPricing");
}

export async function getProviderPricingStats() {
  return withAction(async () => {
    const [
      totalPrices,
      providersWithPrices,
      distinctServices,
      inactivePrices,
    ] = await Promise.all([
      prisma.providerServicePrice.count(),
      prisma.providerServicePrice.groupBy({ by: ["providerId"] }).then((r) => r.length),
      prisma.providerServicePrice.groupBy({ by: ["serviceName"] }).then((r) => r.length),
      prisma.providerServicePrice.count({ where: { isActive: false } }),
    ]);
    return { totalPrices, providersWithPrices, distinctServices, inactivePrices };
  }, "getProviderPricingStats");
}

export async function getProviderPricingDetail(providerId: string) {
  return withAction(async () => {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        businessName: true,
        serviceCategory: true,
        primaryService: true,
        status: true,
        user: { select: { name: true, email: true, phone: true } },
        servicePrices: {
          where: { isActive: true },
          orderBy: { serviceName: "asc" },
        },
      },
    });
    return provider;
  }, "getProviderPricingDetail");
}
