import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { sessionInclude } from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

export const coachSessionListInclude = {
  user: { select: { id: true, name: true, email: true } },
  entitlement: {
    select: {
      coachingOffering: { select: { title: true } },
    },
  },
  checkInShareGrant: {
    select: {
      id: true,
      status: true,
      scopeType: true,
      weekPeriodKey: true,
      startDate: true,
      endDate: true,
      requestedAt: true,
    },
  },
  checkInShareReport: {
    select: { id: true, scopeLabel: true, generatedAt: true },
  },
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
      checkInShareGrant: true,
      checkInShareReport: true,
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

export async function coachUpdateSession(params: {
  coachId: string;
  sessionId: string;
  summary?: string | null;
  bodyMarkdown?: string | null;
  publicationStatus?: "DRAFT" | "PUBLISHED" | "EMPTY";
}) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: params.sessionId },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (session.coachId !== params.coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
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
      throw new ApiError("피드백 본문을 작성한 뒤 발행해 주세요.", 400, "VALIDATION_ERROR");
    }
  }

  const now = new Date();
  const publishing =
    publicationStatus === "PUBLISHED" && session.publicationStatus !== "PUBLISHED";

  const updated = await prisma.coachingSession.update({
    where: { id: session.id },
    data: {
      summary: params.summary === undefined ? undefined : params.summary,
      bodyMarkdown,
      publicationStatus,
      publishedAt: publishing ? now : publicationStatus === "EMPTY" ? null : undefined,
      publishedById: publishing ? params.coachId : publicationStatus === "EMPTY" ? null : undefined,
    },
    include: sessionInclude,
  });

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "CoachingSession",
    entityId: session.id,
    action: publishing ? "SESSION_PUBLISHED" : "SESSION_UPDATED",
    metadata: { publicationStatus: updated.publicationStatus, actorRole: "COACH" },
  });

  return updated;
}
