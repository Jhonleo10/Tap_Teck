"use server";

import { prisma } from "@/lib/prisma";
import { getCountryServiceNames, type CountryCode } from "@/lib/countries";

export type SearchResultItem = {
  id: string;
  type: "user" | "provider" | "booking" | "page";
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearch(
  query: string,
  country = "india"
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const countryServices = getCountryServiceNames(country as CountryCode);
  const serviceFilter = countryServices.length
    ? { serviceName: { in: countryServices } }
    : {};

  const [users, providers, bookings] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "USER",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
      select: { id: true, name: true, email: true },
    }),
    prisma.provider.findMany({
      where: {
        country,
        OR: [
          { businessName: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { serviceCategory: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
      select: { id: true, businessName: true, city: true, serviceCategory: true },
    }),
    prisma.booking.findMany({
      where: {
        country,
        ...serviceFilter,
        OR: [
          { bookingNumber: { contains: q, mode: "insensitive" } },
          { serviceName: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
      select: { id: true, bookingNumber: true, serviceName: true, location: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const results: SearchResultItem[] = [];

  users.forEach((u) =>
    results.push({
      id: u.id,
      type: "user",
      title: u.name ?? u.email,
      subtitle: u.email,
      href: `/users?q=${encodeURIComponent(q)}`,
    })
  );

  providers.forEach((p) =>
    results.push({
      id: p.id,
      type: "provider",
      title: p.businessName,
      subtitle: [p.serviceCategory, p.city].filter(Boolean).join(" · "),
      href: `/providers?q=${encodeURIComponent(q)}`,
    })
  );

  bookings.forEach((b) =>
    results.push({
      id: b.id,
      type: "booking",
      title: b.bookingNumber,
      subtitle: `${b.serviceName} · ${b.location}`,
      href: `/bookings?q=${encodeURIComponent(q)}`,
    })
  );

  const navPages: SearchResultItem[] = [
    { id: "nav-dashboard", type: "page", title: "Dashboard", href: "/dashboard" },
    { id: "nav-analytics", type: "page", title: "Analytics", href: "/analytics" },
    { id: "nav-providers", type: "page", title: "Providers", href: "/providers" },
    { id: "nav-users", type: "page", title: "Users", href: "/users" },
    { id: "nav-bookings", type: "page", title: "Bookings", href: "/bookings" },
    { id: "nav-verification", type: "page", title: "Verification", href: "/verification" },
    { id: "nav-settings", type: "page", title: "Settings", href: "/settings" },
  ];

  const navMatches = navPages.filter((item) =>
    item.title.toLowerCase().includes(q.toLowerCase())
  );

  return [...navMatches, ...results].slice(0, 12);
}
