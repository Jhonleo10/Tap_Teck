import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCountryServices, type CountryCode } from "@/lib/countries";
import { resolveCommissionRate } from "@/lib/commission";

/** Public catalog API for React Native user & provider apps */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get("country") ?? "india") as CountryCode;

  const dbCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      services: {
        where: { isActive: true },
        include: { subServices: { orderBy: { name: "asc" } } },
        orderBy: { catalogId: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const countryServices = getCountryServices(country);
  const countryTitles = new Set(countryServices.map((s) => s.title));

  const settings = await prisma.appSettings.findFirst();
  const defaultCommission = settings?.commissionPercentage ?? 10;

  const categories = dbCategories
    .map((cat) => ({
      id: cat.slug ?? cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      services: cat.services
        .filter((svc) => countryTitles.has(svc.title) || !cat.slug)
        .map((svc) => {
          const serviceCommission = resolveCommissionRate({
            defaultPercentage: defaultCommission,
            servicePercentage: svc.commissionPercentage,
          });
          return {
            id: svc.catalogId,
            title: svc.title,
            description: svc.description,
            icon: svc.icon,
            commissionPercentage: serviceCommission,
            subServices: svc.subServices.map((sub) => ({
              name: sub.name,
              commissionPercentage: resolveCommissionRate({
                defaultPercentage: defaultCommission,
                servicePercentage: svc.commissionPercentage,
                subServicePercentage: sub.commissionPercentage,
              }),
            })),
          };
        }),
    }))
    .filter((cat) => cat.services.length > 0);

  return NextResponse.json({
    country,
    categories,
    settings: settings
      ? {
          commissionPercentage: defaultCommission,
          referralRewardAmount: settings.referralRewardAmount,
        }
      : null,
    updatedAt: new Date().toISOString(),
  });
}
