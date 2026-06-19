import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  action: string;
  entityType: string;
  entityId: string;
  adminId?: string;
  adminName?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      adminId: params.adminId,
      adminName: params.adminName,
      metadata: params.metadata ?? undefined,
    },
  });
}
