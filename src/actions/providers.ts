"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-response";
import { buildOrderBy, resolvePagination, toPaginatedResult } from "@/lib/prisma-pagination";
import { resolveLocationCities, type CountryCode } from "@/lib/countries";
import type { Prisma, ProviderStatus, VerificationStatus } from "@prisma/client";
import type { ActionResponse } from "@/types/action";

export interface ProviderFilters {
  status?: ProviderStatus | "ALL";
  verificationStatus?: VerificationStatus | "ALL";
  service?: string;
  subService?: string;
  location?: string;
  country?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const PROVIDER_SELECT = {
  id: true,
  businessName: true,
  serviceCategory: true,
  primaryService: true,
  location: true,
  city: true,
  state: true,
  country: true,
  status: true,
  verificationStatus: true,
  isVerified: true,
  canReceiveBookings: true,
  rating: true,
  totalReviews: true,
  completedJobs: true,
  createdAt: true,
  user: { select: { name: true, email: true, phone: true } },
  verification: {
    select: {
      id: true,
      aadhaarStatus: true,
      panStatus: true,
      certificateStatus: true,
      addressStatus: true,
      profileStatus: true,
      reviewedAt: true,
      rejectionReason: true,
    },
  },
  _count: { select: { bookings: true } },
} satisfies Prisma.ProviderSelect;

const PROVIDER_SORT_FIELDS = {
  createdAt: true,
  businessName: true,
  rating: true,
  completedJobs: true,
  status: true,
} as const;

function buildLocationWhere(country: string | undefined, location?: string) {
  if (!location || location === "all") return {};

  const cities =
    country && location.startsWith("state:")
      ? resolveLocationCities(country as CountryCode, location)
      : [location];

  return {
    OR: [
      { city: { in: cities } },
      { location: { in: cities } },
      ...(location.startsWith("state:") ? [{ state: location.slice(6) }] : []),
    ],
  };
}

function buildServiceWhere(service?: string, subService?: string): Prisma.ProviderWhereInput {
  const clauses: Prisma.ProviderWhereInput[] = [];

  if (service && service !== "all") {
    clauses.push({
      OR: [
        { primaryService: service },
        { bookings: { some: { serviceName: service } } },
      ],
    });
  }

  if (subService && subService !== "all") {
    clauses.push({
      OR: [
        { primaryService: subService },
        {
          bookings: {
            some: {
              subServiceName: subService,
              ...(service && service !== "all" ? { serviceName: service } : {}),
            },
          },
        },
      ],
    });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

function buildProviderWhere(filters: ProviderFilters = {}): Prisma.ProviderWhereInput {
  const {
    status,
    verificationStatus,
    service,
    subService,
    location,
    country,
    search,
    dateFrom,
    dateTo,
  } = filters;

  return {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(verificationStatus && verificationStatus !== "ALL"
      ? { verificationStatus }
      : {}),
    ...buildServiceWhere(service, subService),
    ...(country ? { country } : {}),
    ...buildLocationWhere(country, location),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { businessName: { contains: search, mode: "insensitive" } },
            { primaryService: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function getProviders(filters: ProviderFilters = {}) {
  return withAction(async () => {
    const { page, pageSize, skip } = resolvePagination(filters);
    const where = buildProviderWhere(filters);
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder,
      PROVIDER_SORT_FIELDS,
      { createdAt: "desc" as const }
    );

    const [items, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        select: PROVIDER_SELECT,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.provider.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  }, "getProviders");
}

export async function updateProviderStatus(
  providerId: string,
  status: ProviderStatus
): Promise<ActionResponse> {
  return withAction(async () => {
    await prisma.provider.update({
      where: { id: providerId },
      data: { status },
    });
    revalidatePath("/providers");
    return undefined;
  }, "updateProviderStatus", "Provider status updated");
}

export async function getProviderStats(
  filters: Omit<ProviderFilters, "page" | "pageSize" | "sortBy" | "sortOrder"> = {}
): Promise<ActionResponse<{ total: number; active: number; pending: number; verified: number }>> {
  return withAction(async () => {
    const where = buildProviderWhere(filters);
    const [total, active, pending, verified] = await Promise.all([
      prisma.provider.count({ where }),
      prisma.provider.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.provider.count({
        where: {
          ...where,
          verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] },
        },
      }),
      prisma.provider.count({ where: { ...where, isVerified: true } }),
    ]);
    return { total, active, pending, verified };
  }, "getProviderStats");
}

export type ProviderListItem = Prisma.ProviderGetPayload<{ select: typeof PROVIDER_SELECT }>;

export type ProviderDetail = NonNullable<
  Prisma.ProviderGetPayload<{
    select: {
      id: true;
      businessName: true;
      serviceCategory: true;
      primaryService: true;
      location: true;
      city: true;
      state: true;
      country: true;
      status: true;
      verificationStatus: true;
      isVerified: true;
      canReceiveBookings: true;
      rating: true;
      totalReviews: true;
      completedJobs: true;
      description: true;
      createdAt: true;
      user: {
        select: {
          id: true;
          name: true;
          email: true;
          phone: true;
          status: true;
          createdAt: true;
        };
      };
      verification: true;
      _count: { select: { bookings: true; reviews: true } };
    };
  }>
>;

export async function getProviderById(
  providerId: string
): Promise<ActionResponse<ProviderDetail | null>> {
  return withAction(async () => {
    return prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        businessName: true,
        serviceCategory: true,
        primaryService: true,
        location: true,
        city: true,
        state: true,
        country: true,
        status: true,
        verificationStatus: true,
        isVerified: true,
        canReceiveBookings: true,
        rating: true,
        totalReviews: true,
        completedJobs: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
        verification: true,
        _count: { select: { bookings: true, reviews: true } },
      },
    });
  }, "getProviderById");
}
