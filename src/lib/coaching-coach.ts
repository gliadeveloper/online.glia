import { normalizeBlockNoteWrite } from "@/lib/media/normalize-blocknote";
import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { sessionInclude } from "@/lib/coaching-admin";
import { coachingSessionHasBody } from "@/lib/coaching-session-content";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { Prisma as PrismaRuntime } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertBodyVersion, assertMediaEditor, syncMediaUsages, withMediaTransaction } from "@/lib/media/usage-sync";
import { createCoachingPublishedNotification } from "@/lib/home-notifications";

export const coachSessionListInclude = {
  user: { select: { id: true, name: true, email: true } },
  entitlement: {
    select: {
      id: true,
      coachingOffering: { select: { title: true } },
    },
  },
  conversation: {
    select: {
      messages: {
        where: { awaitingReply: true },
        orderBy: { createdAt: "asc" as const },
        select: { id: true, bodyMarkdown: true, createdAt: true },
      },
    },
  },
  _count: { select: { logs: true } },
} as const;

export async function listCoachSessions(coachId: string) {
  return prisma.coachingSession.findMany({
    where: { coachId },
    orderBy: [{ scheduledAt: "desc" }, { sessionNo: "asc" }],
    include: coachSessionListInclude,
  });
}

export async function getCoachSessionDetail(sessionId: string, coachId: string) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: sessionId },
    include: {
      ...sessionInclude,
      user: { select: { id: true, name: true, email: true } },
      logs: {
        orderBy: { createdAt: "desc" as const },
        select: { id: true, body: true, createdAt: true },
      },
    },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (session.coachId !== coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  return session;
}

export async function countCoachPendingReplies(coachId: string) {
  return prisma.coachingSessionMessage.count({
    where: {
      awaitingReply: true,
      conversation: { coachId },
    },
  });
}

export async function getCoachEntitlementBoard(entitlementId: string, coachId: string) {
  const entitlement = await prisma.coachingEntitlement.findUnique({
    where: { id: entitlementId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      coachingOffering: { select: { id: true, title: true, slug: true } },
      sessions: {
        orderBy: { sessionNo: "asc" },
        include: coachSessionListInclude,
      },
    },
  });

  if (!entitlement) {
    throw new ApiError("Coaching entitlement not found", 404, "ENTITLEMENT_NOT_FOUND");
  }

  if (entitlement.coachId !== coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  return entitlement;
}

export async function coachUpdateEntitlementSchedules(params: {
  coachId: string;
  entitlementId: string;
  sessions: Array<{ id: string; scheduledAt: Date }>;
}) {
  const entitlement = await prisma.coachingEntitlement.findUnique({
    where: { id: params.entitlementId },
    select: {
      id: true,
      coachId: true,
      sessions: { select: { id: true } },
    },
  });

  if (!entitlement) {
    throw new ApiError("Coaching entitlement not found", 404, "ENTITLEMENT_NOT_FOUND");
  }

  if (entitlement.coachId !== params.coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  const allowed = new Set(entitlement.sessions.map((session) => session.id));
  for (const row of params.sessions) {
    if (!allowed.has(row.id)) {
      throw new ApiError("Session does not belong to this entitlement", 400, "VALIDATION_ERROR");
    }
  }

  await prisma.$transaction(
    params.sessions.map((row) =>
      prisma.coachingSession.update({
        where: { id: row.id },
        data: { scheduledAt: row.scheduledAt },
      }),
    ),
  );

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "CoachingEntitlement",
    entityId: params.entitlementId,
    action: "SESSION_SCHEDULES_UPDATED",
    metadata: { count: params.sessions.length, actorRole: "COACH" },
  });

  return getCoachEntitlementBoard(params.entitlementId, params.coachId);
}

export async function coachUpdateSession(params: {
  coachId: string;
  sessionId: string;
  summary?: string | null;
  expectedBodyVersion?: string;
  bodyMarkdown?: string | null;
  bodyMetadata?: Prisma.InputJsonValue | null;
  publicationStatus?: "DRAFT" | "PUBLISHED" | "EMPTY";
  scheduledAt?: Date;
}, db: PrismaClient = prisma) {
  return withMediaTransaction(db, async (tx) => {
    await tx.$queryRaw`SELECT id FROM coaching_sessions WHERE id = ${params.sessionId} FOR UPDATE`;
    const session = await tx.coachingSession.findUnique({
      where: { id: params.sessionId },
    });

    if (!session) {
      throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
    }

    if (session.coachId !== params.coachId) {
      throw new ApiError("Forbidden", 403, "FORBIDDEN");
    }

    await assertMediaEditor(tx, params.coachId, session.coachId);
    const before = { body: session.bodyMarkdown, metadata: session.bodyMetadata };
    if (params.bodyMarkdown !== undefined || params.bodyMetadata !== undefined) {
      await assertBodyVersion(before, params.expectedBodyVersion);
    }

    const normalized = await normalizeBlockNoteWrite({ body: params.bodyMarkdown, metadata: params.bodyMetadata }, session.bodyMetadata);
    const bodyMarkdown = normalized.body === undefined ? undefined : normalized.body?.trim() || null;
    const bodyMetadata = normalized.metadata === null ? PrismaRuntime.JsonNull : normalized.metadata;

    const publicationStatus = params.publicationStatus;
    if (publicationStatus === "PUBLISHED") {
      const nextSession = {
        bodyMarkdown: bodyMarkdown === undefined ? session.bodyMarkdown : bodyMarkdown,
        bodyMetadata:
          normalized.metadata === undefined ? session.bodyMetadata : normalized.metadata,
      };
      if (!coachingSessionHasBody(nextSession)) {
        throw new ApiError("피드백 본문을 작성한 뒤 발행해 주세요.", 400, "VALIDATION_ERROR");
      }
    }

    const now = new Date();
    const publishing =
      publicationStatus === "PUBLISHED" && session.publicationStatus !== "PUBLISHED";

    const updated = await tx.coachingSession.update({
      where: { id: session.id },
      data: {
        summary: params.summary === undefined ? undefined : params.summary,
        bodyMarkdown,
        bodyMetadata,
        publicationStatus,
        scheduledAt: params.scheduledAt,
        publishedAt: publishing ? now : publicationStatus === "EMPTY" ? null : undefined,
        publishedById: publishing ? params.coachId : publicationStatus === "EMPTY" ? null : undefined,
      },
      include: sessionInclude,
    });
    await syncMediaUsages(tx, { actorId: params.coachId, target: { coachingSessionId: session.id }, before, after: { body: updated.bodyMarkdown, metadata: updated.bodyMetadata } });
    if (publishing) {
      await createCoachingPublishedNotification(tx, { sessionId: session.id, userId: session.userId, occurredAt: now });
    }

    await writeAuditLog({
      actorId: params.coachId,
      entityType: "CoachingSession",
      entityId: session.id,
      action: publishing ? "SESSION_PUBLISHED" : "SESSION_UPDATED",
      metadata: { publicationStatus: updated.publicationStatus, actorRole: "COACH" },
    }, tx);

    return updated;
  });
}
