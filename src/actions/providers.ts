"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ProviderStatus, VerificationStatus } from "@prisma/client";

export async function getProviders(status?: ProviderStatus | "ALL", country?: string) {
  return prisma.provider.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(country ? { country } : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      verification: true,
    },
    orderBy: { createdAt: "desc" },
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
