import type { PrismaClient } from "@prisma/client";
import { serviceCategories, services } from "@/lib/services-data";

const VALID_CATEGORY_SLUGS = new Set<string>(
  serviceCategories.filter((c) => c.id !== "all").map((c) => c.id)
);

const VALID_CATALOG_IDS = new Set(services.map((s) => s.id));

/** Keep the database service catalog in sync with services-data.ts */
export async function syncServiceCatalog(prisma: PrismaClient) {
  const categoryMap = new Map<string, string>();

  for (const cat of serviceCategories.filter((c) => c.id !== "all")) {
    const record = await prisma.serviceCategory.upsert({
      where: { slug: cat.id },
      update: { name: cat.label, isActive: true },
      create: {
        slug: cat.id,
        name: cat.label,
        description: `${cat.label} services on TapTeck`,
        isActive: true,
      },
    });
    categoryMap.set(cat.id, record.id);
  }

  for (const svc of services) {
    const categoryId = categoryMap.get(svc.category);
    if (!categoryId) continue;

    const platformService = await prisma.platformService.upsert({
      where: { catalogId: svc.id },
      update: {
        title: svc.title,
        description: svc.description,
        icon: svc.icon,
        categoryId,
        isActive: true,
      },
      create: {
        catalogId: svc.id,
        title: svc.title,
        description: svc.description,
        icon: svc.icon,
        categoryId,
        isActive: true,
      },
    });

    const validSubNames = new Set(svc.subServices ?? []);

    if (svc.subServices?.length) {
      for (const sub of svc.subServices) {
        await prisma.subService.upsert({
          where: { serviceId_name: { serviceId: platformService.id, name: sub } },
          update: {},
          create: { name: sub, serviceId: platformService.id },
        });
      }
    }

    const existingSubs = await prisma.subService.findMany({
      where: { serviceId: platformService.id },
    });

    for (const sub of existingSubs) {
      if (!validSubNames.has(sub.name)) {
        await prisma.subService.delete({ where: { id: sub.id } });
      }
    }
  }

  const allPlatformServices = await prisma.platformService.findMany({
    select: { id: true, catalogId: true },
  });

  for (const platformService of allPlatformServices) {
    if (!VALID_CATALOG_IDS.has(platformService.catalogId)) {
      await prisma.platformService.update({
        where: { id: platformService.id },
        data: { isActive: false },
      });
    }
  }

  const allCategories = await prisma.serviceCategory.findMany({
    select: { id: true, slug: true },
  });

  for (const category of allCategories) {
    if (!category.slug || !VALID_CATEGORY_SLUGS.has(category.slug)) {
      await prisma.serviceCategory.update({
        where: { id: category.id },
        data: { isActive: false },
      });
    }
  }
}
