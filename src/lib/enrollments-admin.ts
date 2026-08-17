import { addDays, ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function updateEnrollment(params: {
  actorId: string;
  enrollmentId: string;
  status?: "ACTIVE" | "COMPLETED" | "EXPIRED" | "DROPPED" | "SUSPENDED";
  progressPercent?: number;
}) {
  const enrollment = await prisma.enrollment.update({
    where: { id: params.enrollmentId },
    data: {
      status: params.status,
      progressPercent: params.progressPercent,
      completedAt: params.status === "COMPLETED" ? new Date() : undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Enrollment",
    entityId: enrollment.id,
    action: "ENROLLMENT_UPDATED",
    metadata: { status: params.status },
  });

  return enrollment;
}

export async function updateCoachingEntitlementAdmin(params: {
  actorId: string;
  entitlementId: string;
  status?: "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED" | "COMPLETED";
  totalSessions?: number;
  validUntil?: Date;
  extendDays?: number;
}) {
  const existing = await prisma.coachingEntitlement.findUnique({
    where: { id: params.entitlementId },
  });

  if (!existing) {
    throw new ApiError("Entitlement not found", 404, "ENTITLEMENT_NOT_FOUND");
  }

  const validUntil = params.validUntil
    ?? (params.extendDays ? addDays(existing.validUntil, params.extendDays) : undefined);

  const entitlement = await prisma.coachingEntitlement.update({
    where: { id: params.entitlementId },
    data: {
      status: params.status,
      totalSessions: params.totalSessions,
      validUntil,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      coachingOffering: {
        select: { id: true, title: true, slug: true, coach: { select: { id: true, name: true, email: true } } },
      },
      sessions: { orderBy: { scheduledAt: "desc" }, take: 10 },
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingEntitlement",
    entityId: entitlement.id,
    action: "ENTITLEMENT_ADJUSTED",
    metadata: {
      status: params.status,
      totalSessions: params.totalSessions,
      validUntil: validUntil?.toISOString(),
    },
  });

  return entitlement;
}
