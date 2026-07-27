import { Prisma, type CoachingDeliveryMode } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const ACTIVE_SESSION_STATUSES = new Set<string>([
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "RESCHEDULED",
]);

export const coachingOfferingInclude = {
  coach: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, slug: true, title: true } },
  _count: {
    select: {
      entitlements: true,
      productItems: true,
    },
  },
};

export const deliveryModeLabels: Record<CoachingDeliveryMode, string> = {
  LIVE: "라이브",
  ASYNC: "비동기",
  HYBRID: "하이브리드",
};

export async function createCoachingOffering(params: {
  actorId: string;
  title: string;
  slug: string;
  description?: string;
  deliveryMode?: CoachingDeliveryMode;
  totalSessions: number;
  validDays: number;
  sessionMinutes?: number;
  coachId?: string;
  courseId?: string;
  isActive?: boolean;
}) {
  const offering = await prisma.coachingOffering.create({
    data: {
      title: params.title.trim(),
      slug: params.slug.trim(),
      description: params.description?.trim(),
      deliveryMode: params.deliveryMode ?? "LIVE",
      totalSessions: params.totalSessions,
      validDays: params.validDays,
      sessionMinutes: params.sessionMinutes ?? 30,
      coachId: params.coachId,
      courseId: params.courseId,
      isActive: params.isActive ?? true,
    },
    include: coachingOfferingInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingOffering",
    entityId: offering.id,
    action: "COACHING_OFFERING_CREATED",
    metadata: { slug: offering.slug },
  });

  return offering;
}

export async function updateCoachingOffering(params: {
  actorId: string;
  offeringId: string;
  title?: string;
  description?: string;
  totalSessions?: number;
  validDays?: number;
  sessionMinutes?: number;
  maxQuestions?: number | null;
  responseDays?: number | null;
  cancelPolicy?: Prisma.InputJsonValue | null;
  refundPolicy?: Prisma.InputJsonValue | null;
  coachId?: string | null;
  courseId?: string | null;
  isActive?: boolean;
}) {
  const existing = await prisma.coachingOffering.findUnique({
    where: { id: params.offeringId },
  });
  if (!existing) {
    throw new ApiError("Coaching offering not found", 404, "OFFERING_NOT_FOUND");
  }

  const offering = await prisma.coachingOffering.update({
    where: { id: params.offeringId },
    data: {
      title: params.title?.trim(),
      description: params.description?.trim(),
      totalSessions: params.totalSessions,
      validDays: params.validDays,
      sessionMinutes: params.sessionMinutes,
      maxQuestions: params.maxQuestions,
      responseDays: params.responseDays,
      cancelPolicy:
        params.cancelPolicy === undefined
          ? undefined
          : params.cancelPolicy === null
            ? Prisma.DbNull
            : params.cancelPolicy,
      refundPolicy:
        params.refundPolicy === undefined
          ? undefined
          : params.refundPolicy === null
            ? Prisma.DbNull
            : params.refundPolicy,
      coachId: params.coachId,
      courseId: params.courseId,
      isActive: params.isActive,
    },
    include: coachingOfferingInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingOffering",
    entityId: offering.id,
    action: params.isActive === false ? "COACHING_OFFERING_DEACTIVATED" : "COACHING_OFFERING_UPDATED",
    metadata: { slug: offering.slug },
  });

  return offering;
}

export const sessionInclude = {
  user: { select: { id: true, name: true, email: true } },
  coach: { select: { id: true, name: true, email: true } },
  entitlement: {
    select: {
      id: true,
      totalSessions: true,
      usedSessions: true,
      reservedSessions: true,
      coachingOffering: { select: { title: true, slug: true } },
    },
  },
  events: {
    orderBy: { createdAt: "desc" as const },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  },
  intake: true,
  feedback: true,
};

export async function adminUpdateCoachingSession(params: {
  actorId: string;
  sessionId: string;
  action: "cancel" | "complete" | "reschedule" | "set_meeting";
  cancelReason?: string;
  scheduledAt?: Date;
  meetingUrl?: string;
  meetingProvider?: string;
}) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: params.sessionId },
    include: { entitlement: true },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (params.action === "set_meeting") {
    const updated = await prisma.coachingSession.update({
      where: { id: session.id },
      data: {
        meetingUrl: params.meetingUrl?.trim() || null,
        meetingProvider: params.meetingProvider?.trim() || null,
      },
      include: sessionInclude,
    });

    await prisma.coachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: params.actorId,
        fromStatus: session.status,
        toStatus: session.status,
        note: "Meeting link updated by admin",
      },
    });

    await writeAuditLog({
      actorId: params.actorId,
      entityType: "CoachingSession",
      entityId: session.id,
      action: "MEETING_URL_SET",
    });

    return updated;
  }

  if (params.action === "reschedule") {
    if (!params.scheduledAt) {
      throw new ApiError("scheduledAt is required", 400, "VALIDATION_ERROR");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.coachingSession.update({
        where: { id: session.id },
        data: {
          scheduledAt: params.scheduledAt,
          status: "RESCHEDULED",
        },
        include: sessionInclude,
      });

      await tx.coachingSessionEvent.create({
        data: {
          sessionId: session.id,
          actorId: params.actorId,
          fromStatus: session.status,
          toStatus: "RESCHEDULED",
          note: "Rescheduled by admin",
        },
      });

      return next;
    });

    await writeAuditLog({
      actorId: params.actorId,
      entityType: "CoachingSession",
      entityId: session.id,
      action: "SESSION_RESCHEDULED",
      metadata: { scheduledAt: params.scheduledAt.toISOString() },
    });

    return updated;
  }

  if (!ACTIVE_SESSION_STATUSES.has(session.status)) {
    throw new ApiError(`Session is already ${session.status}`, 409, "SESSION_NOT_ACTIVE");
  }

  if (params.action === "cancel") {
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.coachingSession.update({
        where: { id: session.id },
        data: {
          status: "CANCELLED_BY_COACH",
          cancelledAt: new Date(),
          cancelReason: params.cancelReason ?? "Cancelled by admin",
        },
        include: sessionInclude,
      });

      await tx.coachingEntitlement.update({
        where: { id: session.entitlementId },
        data: { reservedSessions: { decrement: 1 } },
      });

      await tx.coachingSessionEvent.create({
        data: {
          sessionId: session.id,
          actorId: params.actorId,
          fromStatus: session.status,
          toStatus: "CANCELLED_BY_COACH",
          note: params.cancelReason ?? "Cancelled by admin",
        },
      });

      return next;
    });

    await writeAuditLog({
      actorId: params.actorId,
      entityType: "CoachingSession",
      entityId: session.id,
      action: "SESSION_CANCELLED_BY_ADMIN",
    });

    return updated;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const entitlement = session.entitlement;
    const nextUsedSessions = entitlement.usedSessions + 1;
    const nextEntitlementStatus =
      nextUsedSessions >= entitlement.totalSessions ? "EXHAUSTED" : entitlement.status;

    const next = await tx.coachingSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: sessionInclude,
    });

    await tx.coachingEntitlement.update({
      where: { id: session.entitlementId },
      data: {
        reservedSessions: { decrement: 1 },
        usedSessions: { increment: 1 },
        status: nextEntitlementStatus,
      },
    });

    await tx.coachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: params.actorId,
        fromStatus: session.status,
        toStatus: "COMPLETED",
        note: "Completed by admin",
      },
    });

    return next;
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingSession",
    entityId: session.id,
    action: "SESSION_COMPLETED",
  });

  return updated;
}
