import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export async function writeAuditLog(params: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
}, db: Pick<Prisma.TransactionClient, "auditLog"> = prisma) {
  return db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      metadata: params.metadata,
    },
  });
}
