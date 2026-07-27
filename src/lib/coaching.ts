import type { CoachingEntitlement, CoachingSessionStatus, Prisma } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ACTIVE_SESSION_STATUSES = new Set([
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "RESCHEDULED",
]);

export function getRemainingSessions(entitlement: Pick<
  CoachingEntitlement,
  "totalSessions" | "usedSessions" | "reservedSessions"
>) {
  return entitlement.totalSessions - entitlement.usedSessions - entitlement.reservedSessions;
}

export function assertEntitlementBookable(entitlement: CoachingEntitlement) {
  const now = new Date();

  if (entitlement.status !== "ACTIVE") {
    throw new ApiError(`Coaching entitlement is ${entitlement.status}`, 409, "ENTITLEMENT_NOT_ACTIVE");
  }

  if (now < entitlement.validFrom || now > entitlement.validUntil) {
    throw new ApiError("Coaching entitlement is outside the valid period", 409, "ENTITLEMENT_EXPIRED");
  }

  if (getRemainingSessions(entitlement) <= 0) {
    throw new ApiError("No remaining coaching sessions", 409, "NO_SESSIONS_LEFT");
  }
}

export async function bookCoachingSession(params: {
  userId: string;
  entitlementId: string;
  scheduledAt: Date;
  meetingUrl?: string;
  meetingProvider?: string;
  answers?: Prisma.InputJsonValue;
}) {
  const entitlement = await prisma.coachingEntitlement.findUnique({
    where: { id: params.entitlementId },
    include: {
      coachingOffering: true,
    },
  });

  if (!entitlement) {
    throw new ApiError("Coaching entitlement not found", 404, "ENTITLEMENT_NOT_FOUND");
  }

  if (entitlement.userId !== params.userId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  assertEntitlementBookable(entitlement);

  const coachId = entitlement.coachId ?? entitlement.coachingOffering.coachId;
  if (!coachId) {
    throw new ApiError("No coach assigned to this entitlement", 409, "COACH_NOT_ASSIGNED");
  }

  if (params.scheduledAt <= new Date()) {
    throw new ApiError("scheduledAt must be in the future", 400, "INVALID_SCHEDULE");
  }

  const sessionNo = entitlement.usedSessions + entitlement.reservedSessions + 1;

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.coachingSession.create({
      data: {
        entitlementId: entitlement.id,
        coachId,
        userId: params.userId,
        sessionNo,
        status: "CONFIRMED",
        scheduledAt: params.scheduledAt,
        durationMinutes: entitlement.coachingOffering.sessionMinutes,
        meetingUrl: params.meetingUrl,
        meetingProvider: params.meetingProvider ?? "zoom",
      },
    });

    await tx.coachingEntitlement.update({
      where: { id: entitlement.id },
      data: { reservedSessions: { increment: 1 } },
    });

    if (params.answers) {
      await tx.coachingIntake.create({
        data: {
          entitlementId: entitlement.id,
          sessionId: created.id,
          answers: params.answers,
        },
      });
    }

    await tx.coachingSessionEvent.create({
      data: {
        sessionId: created.id,
        actorId: params.userId,
        toStatus: "CONFIRMED",
        note: "Session booked",
      },
    });

    return tx.coachingSession.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        intake: true,
        coach: { select: { id: true, name: true, email: true } },
        entitlement: {
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            reservedSessions: true,
            validUntil: true,
            status: true,
          },
        },
      },
    });
  });

  return session;
}

export async function updateCoachingSession(params: {
  userId: string;
  sessionId: string;
  action: "cancel" | "complete";
  cancelReason?: string;
  actorRole?: "student" | "coach";
}) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: params.sessionId },
    include: { entitlement: true },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  const isStudent = session.userId === params.userId;
  const isCoach = session.coachId === params.userId;

  if (!isStudent && !isCoach) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (!ACTIVE_SESSION_STATUSES.has(session.status)) {
    throw new ApiError(`Session is already ${session.status}`, 409, "SESSION_NOT_ACTIVE");
  }

  if (params.action === "cancel") {
    const nextStatus: CoachingSessionStatus = isCoach
      ? "CANCELLED_BY_COACH"
      : "CANCELLED_BY_USER";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.coachingSession.update({
        where: { id: session.id },
        data: {
          status: nextStatus,
          cancelledAt: new Date(),
          cancelReason: params.cancelReason,
        },
        include: {
          entitlement: true,
          coach: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.coachingEntitlement.update({
        where: { id: session.entitlementId },
        data: { reservedSessions: { decrement: 1 } },
      });

      await tx.coachingSessionEvent.create({
        data: {
          sessionId: session.id,
          actorId: params.userId,
          fromStatus: session.status,
          toStatus: nextStatus,
          note: params.cancelReason,
        },
      });

      return updated;
    });
  }

  return prisma.$transaction(async (tx) => {
    const entitlement = session.entitlement;
    const nextUsedSessions = entitlement.usedSessions + 1;
    const nextStatus =
      nextUsedSessions >= entitlement.totalSessions ? "EXHAUSTED" : entitlement.status;

    const updated = await tx.coachingSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: {
        coach: { select: { id: true, name: true, email: true } },
      },
    });

    const updatedEntitlement = await tx.coachingEntitlement.update({
      where: { id: session.entitlementId },
      data: {
        reservedSessions: { decrement: 1 },
        usedSessions: { increment: 1 },
        status: nextStatus,
      },
    });

    await tx.coachingSessionEvent.create({
      data: {
        sessionId: session.id,
        actorId: params.userId,
        fromStatus: session.status,
        toStatus: "COMPLETED",
        note: "Session completed",
      },
    });

    return { ...updated, entitlement: updatedEntitlement };
  });
}
