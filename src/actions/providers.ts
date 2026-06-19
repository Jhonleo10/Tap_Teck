"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveLocationCities, type CountryCode } from "@/lib/countries";
import type { ProviderStatus, VerificationStatus } from "@prisma/client";

export interface ProviderFilters {
  status?: ProviderStatus | "ALL";
  verificationStatus?: VerificationStatus | "ALL";
  category?: string;
  service?: string;
  location?: string;
  country?: string;
  search?: string;
}

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
      ...(location.startsWith("state:")
        ? [{ state: location.slice(6) }]
        : []),
    ],
  };
}

export async function getProviders(filters: ProviderFilters = {}) {
  const {
    status,
    verificationStatus,
    category,
    service,
    location,
    country,
    search,
  } = filters;

  return prisma.provider.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(verificationStatus && verificationStatus !== "ALL"
        ? { verificationStatus }
        : {}),
      ...(category && category !== "all" ? { serviceCategory: category } : {}),
      ...(service && service !== "all" ? { primaryService: service } : {}),
      ...(country ? { country } : {}),
      ...buildLocationWhere(country, location),
      ...(search
        ? {
          OR: [
            { businessName: { contains: search, mode: "insensitive" } },
            { serviceCategory: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      verification: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function getProvidersByVerification(
  verificationStatus?: VerificationStatus | "ALL"
) {
  return prisma.provider.findMany({
    where:
      verificationStatus && verificationStatus !== "ALL"
        ? { verificationStatus }
        : undefined,
    include: {
      user: { select: { name: true, email: true } },
      verification: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function updateProviderStatus(
  providerId: string,
  status: ProviderStatus
) {
  await prisma.provider.update({
    where: { id: providerId },
    data: { status },
  });
  revalidatePath("/providers");
  return { success: true };
}

export async function updateVerificationStatus(
  providerId: string,
  verificationStatus: VerificationStatus,
  rejectionReason?: string
) {
  const isVerified = verificationStatus === "VERIFIED";
  const canReceiveBookings = isVerified;

  await prisma.$transaction([
    prisma.provider.update({
      where: { id: providerId },
      data: {
        verificationStatus,
        isVerified,
        canReceiveBookings,
        status: isVerified ? "ACTIVE" : verificationStatus === "REJECTED" ? "INACTIVE" : "PENDING",
      },
    }),
    prisma.providerVerification.update({
      where: { providerId },
      data: {
        rejectionReason: rejectionReason ?? null,
        reviewedAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/providers");
  revalidatePath("/verification");
  return { success: true };
}

export async function updateDocumentStatus(
  providerId: string,
  field: "aadhaarStatus" | "panStatus" | "certificateStatus" | "addressStatus" | "profileStatus",
  status: "APPROVED" | "REJECTED" | "PENDING"
) {
  await prisma.providerVerification.update({
    where: { providerId },
    data: { [field]: status },
  });
  revalidatePath("/verification");
  return { success: true };
}
