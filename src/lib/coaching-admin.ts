import { ApiError, addDays } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { provisionCoachingSessions, syncOfferingSessionTemplates } from "@/lib/coaching-provision";
import { prisma } from "@/lib/prisma";

export const coachingOfferingInclude = {
  coach: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, slug: true, title: true } },
  sessionTemplates: { orderBy: { sessionNo: "asc" as const } },
  _count: {
    select: {
      entitlements: true,
      productItems: true,
    },
  },
};

export async function createCoachingOffering(params: {
  actorId: string;
  title: string;
  slug: string;
  description?: string;
  totalSessions: number;
  validDays: number;
  coachId?: string;
  courseId?: string;
  isActive?: boolean;
  sessionTitles?: string[];
}) {
  const offering = await prisma.$transaction(async (tx) => {
    const created = await tx.coachingOffering.create({
      data: {
        title: params.title.trim(),
        slug: params.slug.trim(),
        description: params.description?.trim(),
        totalSessions: params.totalSessions,
        validDays: params.validDays,
        coachId: params.coachId,
        courseId: params.courseId,
        isActive: params.isActive ?? true,
      },
    });

    await syncOfferingSessionTemplates(
      tx,
      created.id,
      params.totalSessions,
      params.sessionTitles,
    );

    return tx.coachingOffering.findUniqueOrThrow({
      where: { id: created.id },
      include: coachingOfferingInclude,
    });
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
  coachId?: string | null;
  courseId?: string | null;
  isActive?: boolean;
  sessionTitles?: string[];
}) {
  const existing = await prisma.coachingOffering.findUnique({
    where: { id: params.offeringId },
  });
  if (!existing) {
    throw new ApiError("Coaching offering not found", 404, "OFFERING_NOT_FOUND");
  }

  const offering = await prisma.$transaction(async (tx) => {
    const updated = await tx.coachingOffering.update({
      where: { id: params.offeringId },
      data: {
        title: params.title?.trim(),
        description: params.description?.trim(),
        totalSessions: params.totalSessions,
        validDays: params.validDays,
        coachId: params.coachId,
        courseId: params.courseId,
        isActive: params.isActive,
      },
    });

    if (params.totalSessions !== undefined || params.sessionTitles) {
      await syncOfferingSessionTemplates(
        tx,
        updated.id,
        params.totalSessions ?? updated.totalSessions,
        params.sessionTitles,
      );
    }

    return tx.coachingOffering.findUniqueOrThrow({
      where: { id: updated.id },
      include: coachingOfferingInclude,
    });
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
  publishedBy: { select: { id: true, name: true, email: true } },
  entitlement: {
    select: {
      id: true,
      totalSessions: true,
      completedSessions: true,
      coachingOffering: { select: { title: true, slug: true } },
    },
  },
  progress: true,
  conversation: {
    include: {
      messages: {
        orderBy: { createdAt: "asc" as const },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
};

export async function adminUpdateCoachingSession(params: {
  actorId: string;
  sessionId: string;
  title?: string;
  summary?: string | null;
  scheduledAt?: Date;
  bodyMarkdown?: string | null;
  publicationStatus?: "DRAFT" | "PUBLISHED" | "EMPTY";
  progressStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: params.sessionId },
    include: { entitlement: true },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  const bodyMarkdown =
    params.bodyMarkdown === undefined
      ? undefined
      : params.bodyMarkdown === null
        ? null
        : params.bodyMarkdown.trim();

  let publicationStatus = params.publicationStatus;
  if (publicationStatus === "PUBLISHED") {
    const nextBody = bodyMarkdown ?? session.bodyMarkdown;
    if (!nextBody?.trim()) {
      throw new ApiError("bodyMarkdown is required to publish", 400, "VALIDATION_ERROR");
    }
  }

  const now = new Date();
  const publishing =
    publicationStatus === "PUBLISHED" && session.publicationStatus !== "PUBLISHED";

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.coachingSession.update({
      where: { id: session.id },
      data: {
        title: params.title?.trim(),
        summary: params.summary === undefined ? undefined : params.summary,
        scheduledAt: params.scheduledAt,
        bodyMarkdown,
        publicationStatus,
        publishedAt: publishing ? now : publicationStatus === "EMPTY" ? null : undefined,
        publishedById: publishing ? params.actorId : publicationStatus === "EMPTY" ? null : undefined,
        progressStatus: params.progressStatus,
        completedAt:
          params.progressStatus === "COMPLETED"
            ? now
            : params.progressStatus
              ? null
              : undefined,
      },
      include: sessionInclude,
    });

    if (params.progressStatus === "COMPLETED" && session.progressStatus !== "COMPLETED") {
      await tx.coachingSessionProgress.update({
        where: { sessionId: session.id },
        data: { status: "COMPLETED", completedAt: now },
      });

      const completedCount = await tx.coachingSession.count({
        where: {
          entitlementId: session.entitlementId,
          progressStatus: "COMPLETED",
        },
      });

      await tx.coachingEntitlement.update({
        where: { id: session.entitlementId },
        data: {
          completedSessions: completedCount,
          status:
            completedCount >= session.entitlement.totalSessions ? "COMPLETED" : session.entitlement.status,
        },
      });
    }

    return next;
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingSession",
    entityId: session.id,
    action: publishing ? "SESSION_PUBLISHED" : "SESSION_UPDATED",
    metadata: {
      publicationStatus: updated.publicationStatus,
      sessionNo: updated.sessionNo,
    },
  });

  return updated;
}

export async function adminGrantCoachingEntitlementWithSessions(params: {
  actorId: string;
  userId: string;
  coachingOfferingId: string;
  totalSessions?: number;
  validDays?: number;
}) {
  const offering = await prisma.coachingOffering.findUniqueOrThrow({
    where: { id: params.coachingOfferingId },
  });

  if (!offering.coachId) {
    throw new ApiError("Coaching offering has no coach assigned", 409, "COACH_NOT_ASSIGNED");
  }

  const now = new Date();
  const validDays = params.validDays ?? offering.validDays;
  const totalSessions = params.totalSessions ?? offering.totalSessions;

  const entitlement = await prisma.$transaction(async (tx) => {
    const created = await tx.coachingEntitlement.create({
      data: {
        userId: params.userId,
        coachingOfferingId: offering.id,
        coachId: offering.coachId,
        courseId: offering.courseId,
        totalSessions,
        validFrom: now,
        validUntil: addDays(now, validDays),
        status: "ACTIVE",
      },
    });

    await provisionCoachingSessions(tx, {
      entitlementId: created.id,
      userId: params.userId,
      coachId: offering.coachId!,
      offeringId: offering.id,
      totalSessions,
      validFrom: now,
    });

    return tx.coachingEntitlement.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        coachingOffering: {
          select: {
            id: true,
            title: true,
            slug: true,
            coach: { select: { name: true, email: true } },
          },
        },
        sessions: { orderBy: { sessionNo: "asc" } },
      },
    });
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingEntitlement",
    entityId: entitlement.id,
    action: "ENTITLEMENT_GRANTED",
    metadata: { userId: params.userId, offeringId: offering.id },
  });

  return entitlement;
}
