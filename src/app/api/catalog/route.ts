import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCountryServices, type CountryCode } from "@/lib/countries";

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

  const categories = dbCategories
    .map((cat) => ({
      id: cat.slug ?? cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      services: cat.services
        .filter((svc) => countryTitles.has(svc.title) || !cat.slug)
        .map((svc) => ({
          id: svc.catalogId,
          title: svc.title,
          description: svc.description,
          icon: svc.icon,
          subServices: svc.subServices.map((sub) => sub.name),
        })),
    }))
    .filter((cat) => cat.services.length > 0);

  const settings = await prisma.appSettings.findFirst();

  return NextResponse.json({
    country,
    categories,
    settings: settings
      ? {
          commissionPercentage: settings.commissionPercentage,
          referralRewardAmount: settings.referralRewardAmount,
        }
      : null,
    updatedAt: new Date().toISOString(),
  });
}
