import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export async function writeAuditLog(params: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      metadata: params.metadata,
    },
  });
}
