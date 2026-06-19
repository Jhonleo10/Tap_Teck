"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  buildAutomatedMessage,
  type VerificationMessageAction,
} from "@/lib/verification-messages";
import {
  allDocsApproved,
  getDocumentDefinition,
  type DocumentType,
} from "@/lib/verification-documents";
import type { DocStatus, VerificationStatus } from "@prisma/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

async function getAdminContext() {
  const session = await auth();
  return {
    adminId: session?.user?.id,
    adminName: session?.user?.name ?? session?.user?.email ?? "Admin",
  };
}

async function sendProviderNotification(
  providerId: string,
  userId: string,
  title: string,
  body: string,
  type: string
) {
  await prisma.notification.create({
    data: {
      providerId,
      userId,
      title,
      body,
      type,
      channel: "IN_APP",
    },
  });
}

async function recordVerificationMessage(
  providerId: string,
  action: VerificationMessageAction,
  documentType?: DocumentType,
  customNote?: string
) {
  const { adminId, adminName } = await getAdminContext();
  const { title, body } = buildAutomatedMessage(action, documentType, customNote);

  await prisma.verificationMessage.create({
    data: {
      providerId,
      documentType: documentType ?? null,
      message: body,
      action,
      isAutomated: !customNote?.trim(),
      adminId,
      adminName,
    },
  });

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });

  if (provider) {
    await sendProviderNotification(providerId, provider.userId, title, body, action);
  }

  return { title, body };
}

function mergeDocumentNote(
  existing: unknown,
  documentType: DocumentType,
  note: string | null
): Record<string, string> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, string>) }
      : {};
  if (note) base[documentType] = note;
  else delete base[documentType];
  return base;
}

export async function getVerificationProviders(params: {
  status?: VerificationStatus | "ALL";
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(params.status && params.status !== "ALL"
      ? { verificationStatus: params.status }
      : {}),
    ...(params.search
      ? {
          OR: [
            { businessName: { contains: params.search, mode: "insensitive" as const } },
            { user: { name: { contains: params.search, mode: "insensitive" as const } } },
            { user: { email: { contains: params.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, total, counts] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        verification: true,
        messages: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.provider.count({ where }),
    prisma.provider.groupBy({
      by: ["verificationStatus"],
      _count: { _all: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    counts.map((c) => [c.verificationStatus, c._count._all])
  ) as Record<VerificationStatus, number>;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    statusCounts,
  };
}

export async function getVerificationMessages(providerId: string) {
  return prisma.verificationMessage.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewDocument(params: {
  providerId: string;
  documentType: DocumentType;
  status: Extract<DocStatus, "APPROVED" | "REJECTED" | "REUPLOAD_REQUESTED">;
  note?: string;
}) {
  const { providerId, documentType, status, note } = params;
  const doc = getDocumentDefinition(documentType);
  const { adminId, adminName } = await getAdminContext();

  const existing = await prisma.providerVerification.findUnique({
    where: { providerId },
  });

  if (!existing) throw new Error("Verification record not found");

  const currentStatus = existing[doc.statusField];
  if (currentStatus !== "PENDING" && currentStatus !== "REUPLOAD_REQUESTED") {
    throw new Error("This document is not awaiting review");
  }

  const actionMap = {
    APPROVED: "DOC_APPROVED",
    REJECTED: "DOC_REJECTED",
    REUPLOAD_REQUESTED: "DOC_REUPLOAD_REQUESTED",
  } as const;

  const documentNotes = mergeDocumentNote(
    existing.documentNotes,
    documentType,
    note ?? null
  );

  await prisma.providerVerification.update({
    where: { providerId },
    data: {
      [doc.statusField]: status,
      documentNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  await recordVerificationMessage(
    providerId,
    actionMap[status],
    documentType,
    note
  );

  await createAuditLog({
    action: `DOCUMENT_${status}`,
    entityType: "ProviderVerification",
    entityId: providerId,
    adminId,
    adminName,
    metadata: { documentType, note },
  });

  revalidatePath("/verification");
  revalidatePath("/providers");
  return { success: true };
}

export async function updateProviderVerificationStatus(params: {
  providerId: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
}) {
  const { providerId, verificationStatus, rejectionReason } = params;
  const { adminId, adminName } = await getAdminContext();

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { verification: true },
  });

  if (!provider) throw new Error("Provider not found");

  if (verificationStatus === "VERIFIED" && !allDocsApproved(provider.verification)) {
    throw new Error("All documents must be approved before verifying the provider");
  }

  const isVerified = verificationStatus === "VERIFIED";
  const actionMap: Partial<Record<VerificationStatus, VerificationMessageAction>> = {
    UNDER_REVIEW: "PROVIDER_UNDER_REVIEW",
    VERIFIED: "PROVIDER_VERIFIED",
    REJECTED: "PROVIDER_REJECTED",
  };

  await prisma.$transaction([
    prisma.provider.update({
      where: { id: providerId },
      data: {
        verificationStatus,
        isVerified,
        canReceiveBookings: isVerified,
        status: isVerified
          ? "ACTIVE"
          : verificationStatus === "REJECTED"
            ? "INACTIVE"
            : "PENDING",
      },
    }),
    prisma.providerVerification.update({
      where: { providerId },
      data: {
        rejectionReason: rejectionReason ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    }),
  ]);

  const messageAction = actionMap[verificationStatus];
  if (messageAction) {
    await recordVerificationMessage(
      providerId,
      messageAction,
      undefined,
      rejectionReason
    );
  }

  await createAuditLog({
    action: `PROVIDER_${verificationStatus}`,
    entityType: "Provider",
    entityId: providerId,
    adminId,
    adminName,
    metadata: { rejectionReason },
  });

  revalidatePath("/verification");
  revalidatePath("/providers");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Provider app API: resubmit only when re-upload was requested */
export async function providerResubmitDocument(params: {
  providerId: string;
  documentType: DocumentType;
  documentUrl: string;
}) {
  const doc = getDocumentDefinition(params.documentType);
  const existing = await prisma.providerVerification.findUnique({
    where: { providerId: params.providerId },
  });

  if (!existing) throw new Error("Verification record not found");

  const currentStatus = existing[doc.statusField];
  if (currentStatus !== "REUPLOAD_REQUESTED" && currentStatus !== "REJECTED") {
    throw new Error("Re-upload is not allowed until admin requests it");
  }

  const updateData: Record<string, unknown> = {
    [doc.statusField]: "PENDING",
  };

  if (doc.urlField) {
    updateData[doc.urlField] = params.documentUrl;
  }

  await prisma.providerVerification.update({
    where: { providerId: params.providerId },
    data: updateData,
  });

  revalidatePath("/verification");
  return { success: true };
}
