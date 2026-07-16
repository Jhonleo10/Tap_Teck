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

  const settings = await prisma.appSettings.findFirst();

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
          subServices: svc.subServices.map((sub) => ({
            name: sub.name,
          })),
        })),
    }))
    .filter((cat) => cat.services.length > 0);

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMode: true,
      durationDays: true,
      features: true,
    },
  });

  return NextResponse.json({
    country,
    categories,
    plans,
    settings: settings
      ? {
          referralRewardAmount: settings.referralRewardAmount,
        }
      : null,
    updatedAt: new Date().toISOString(),
  });
}
