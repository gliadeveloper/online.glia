import type { CheckInShareGrantStatus, CheckInShareScopeType } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { buildCheckInShareReportPayload, parseReportContent } from "@/lib/checkin-share/build-report";
import { resolveShareScope } from "@/lib/checkin-share/scope";
import type { CheckInShareGrantPreview } from "@/lib/checkin-share/types";
import { getWeekPeriodKey } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export const shareGrantInclude = {
  coach: { select: { id: true, name: true, email: true } },
  user: { select: { id: true, name: true, email: true } },
  session: {
    select: {
      id: true,
      sessionNo: true,
      title: true,
      scheduledAt: true,
      coachId: true,
    },
  },
  entitlement: {
    select: {
      id: true,
      status: true,
      validFrom: true,
      validUntil: true,
    },
  },
  report: true,
} as const;

function mapScopeError(error: unknown): never {
  if (!(error instanceof Error)) {
    throw new ApiError("Invalid share scope", 400, "INVALID_SCOPE");
  }

  const code = error.message;
  const messages: Record<string, string> = {
    INVALID_WEEK_PERIOD_KEY: "주간 키가 올바르지 않습니다.",
    FUTURE_WEEK: "아직 시작되지 않은 주는 공유할 수 없습니다.",
    RANGE_DATES_REQUIRED: "시작일과 종료일을 입력해 주세요.",
    INVALID_DATE_KEY: "날짜 형식이 올바르지 않습니다.",
    INVALID_RANGE_ORDER: "종료일은 시작일 이후여야 합니다.",
    FUTURE_END_DATE: "오늘 이후 날짜는 공유할 수 없습니다.",
    RANGE_TOO_LONG: "기간은 최대 14일까지 선택할 수 있습니다.",
  };

  throw new ApiError(messages[code] ?? "공유 범위가 올바르지 않습니다.", 400, code);
}

async function assertCoachOwnsSession(coachId: string, sessionId: string) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: sessionId },
    include: {
      entitlement: {
        select: { id: true, status: true, userId: true },
      },
    },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (session.coachId !== coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (session.entitlement.status !== "ACTIVE") {
    throw new ApiError("Coaching entitlement is not active", 409, "ENTITLEMENT_INACTIVE");
  }

  return session;
}

export async function getCoachSessionShareGrant(sessionId: string, coachId: string) {
  await assertCoachOwnsSession(coachId, sessionId);

  return prisma.checkInShareGrant.findUnique({
    where: { sessionId },
    include: shareGrantInclude,
  });
}

export async function createOrRefreshShareGrant(params: {
  coachId: string;
  sessionId: string;
  scopeType: CheckInShareScopeType;
  weekPeriodKey?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  coachMessage?: string | null;
}) {
  const session = await assertCoachOwnsSession(params.coachId, params.sessionId);
  const timezone = "Asia/Seoul";

  let scope;
  try {
    const weekKey =
      params.scopeType === "WEEK" && !params.weekPeriodKey
        ? getWeekPeriodKey(timezone, session.scheduledAt)
        : params.weekPeriodKey;

    scope = resolveShareScope(
      {
        scopeType: params.scopeType,
        weekPeriodKey: weekKey,
        startDate: params.startDate,
        endDate: params.endDate,
      },
      timezone,
    );
  } catch (error) {
    mapScopeError(error);
  }

  const existing = await prisma.checkInShareGrant.findUnique({
    where: { sessionId: params.sessionId },
  });

  if (existing?.status === "GRANTED") {
    throw new ApiError("Already shared for this session", 409, "ALREADY_GRANTED");
  }

  const message = params.coachMessage?.trim() || null;

  const grant = existing
    ? await prisma.checkInShareGrant.update({
        where: { id: existing.id },
        data: {
          scopeType: scope.scopeType,
          weekPeriodKey: scope.weekPeriodKey,
          startDate: scope.startDate,
          endDate: scope.endDate,
          coachMessage: message,
          status: "PENDING",
          requestedAt: new Date(),
          respondedAt: null,
        },
        include: shareGrantInclude,
      })
    : await prisma.checkInShareGrant.create({
        data: {
          entitlementId: session.entitlementId,
          sessionId: params.sessionId,
          coachId: params.coachId,
          userId: session.userId,
          scopeType: scope.scopeType,
          weekPeriodKey: scope.weekPeriodKey,
          startDate: scope.startDate,
          endDate: scope.endDate,
          coachMessage: message,
          status: "PENDING",
        },
        include: shareGrantInclude,
      });

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "CheckInShareGrant",
    entityId: grant.id,
    action: existing ? "SHARE_REQUEST_UPDATED" : "SHARE_REQUEST_CREATED",
    metadata: {
      sessionId: params.sessionId,
      scopeType: scope.scopeType,
      scopeLabel: scope.scopeLabel,
    },
  });

  return grant;
}

export async function cancelShareGrant(params: { coachId: string; sessionId: string }) {
  const grant = await prisma.checkInShareGrant.findUnique({
    where: { sessionId: params.sessionId },
  });

  if (!grant) {
    throw new ApiError("Share grant not found", 404, "GRANT_NOT_FOUND");
  }

  if (grant.coachId !== params.coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (grant.status !== "PENDING") {
    throw new ApiError("Only pending requests can be cancelled", 409, "INVALID_STATUS");
  }

  return prisma.checkInShareGrant.update({
    where: { id: grant.id },
    data: { status: "CANCELLED" },
    include: shareGrantInclude,
  });
}

async function buildPreviewForGrant(
  grant: NonNullable<Awaited<ReturnType<typeof prisma.checkInShareGrant.findUnique>>>,
): Promise<CheckInShareGrantPreview> {
  const session = await prisma.coachingSession.findUniqueOrThrow({
    where: { id: grant.sessionId },
    select: { sessionNo: true, title: true },
  });

  const coach = await prisma.user.findUniqueOrThrow({
    where: { id: grant.coachId },
    select: { name: true, email: true },
  });

  const payload = await buildCheckInShareReportPayload({
    userId: grant.userId,
    scopeType: grant.scopeType,
    weekPeriodKey: grant.weekPeriodKey,
    startDate: grant.startDate,
    endDate: grant.endDate,
  });

  const scopeLabel = payload.scope.scopeLabel;

  return {
    grantId: grant.id,
    status: grant.status,
    scopeType: grant.scopeType,
    scopeLabel,
    coachMessage: grant.coachMessage,
    coachName: coach.name ?? coach.email,
    sessionNo: session.sessionNo,
    sessionTitle: session.title,
    requestedAt: grant.requestedAt.toISOString(),
    content: payload.content,
    canAccept: grant.status === "PENDING" && payload.hasShareableRecords,
    canDecline: grant.status === "PENDING",
  };
}

export async function getShareGrantPreviewForMember(grantId: string, userId: string) {
  const grant = await prisma.checkInShareGrant.findUnique({
    where: { id: grantId },
  });

  if (!grant) {
    throw new ApiError("Share grant not found", 404, "GRANT_NOT_FOUND");
  }

  if (grant.userId !== userId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (grant.status === "CANCELLED" || grant.status === "EXPIRED") {
    throw new ApiError("This share request is no longer available", 410, "GRANT_UNAVAILABLE");
  }

  return buildPreviewForGrant(grant);
}

export async function respondToShareGrant(params: {
  grantId: string;
  userId: string;
  decision: "ACCEPT" | "DECLINE";
}) {
  const grant = await prisma.checkInShareGrant.findUnique({
    where: { id: params.grantId },
  });

  if (!grant) {
    throw new ApiError("Share grant not found", 404, "GRANT_NOT_FOUND");
  }

  if (grant.userId !== params.userId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (grant.status !== "PENDING") {
    throw new ApiError("This request has already been answered", 409, "INVALID_STATUS");
  }

  if (params.decision === "DECLINE") {
    const declined = await prisma.checkInShareGrant.update({
      where: { id: grant.id },
      data: { status: "DECLINED", respondedAt: new Date() },
      include: shareGrantInclude,
    });

    await writeAuditLog({
      actorId: params.userId,
      entityType: "CheckInShareGrant",
      entityId: grant.id,
      action: "SHARE_DECLINED",
    });

    return { grant: declined, report: null };
  }

  const payload = await buildCheckInShareReportPayload({
    userId: grant.userId,
    scopeType: grant.scopeType,
    weekPeriodKey: grant.weekPeriodKey,
    startDate: grant.startDate,
    endDate: grant.endDate,
  });

  if (!payload.hasShareableRecords) {
    throw new ApiError(
      "공유할 체크인 기록이 없습니다. 기록을 작성한 뒤 다시 수락해 주세요.",
      409,
      "NO_RECORDS",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedGrant = await tx.checkInShareGrant.update({
      where: { id: grant.id },
      data: { status: "GRANTED", respondedAt: new Date() },
    });

    const report = await tx.checkInShareReport.create({
      data: {
        grantId: grant.id,
        entitlementId: grant.entitlementId,
        sessionId: grant.sessionId,
        userId: grant.userId,
        coachId: grant.coachId,
        scopeType: grant.scopeType,
        weekPeriodKey: grant.weekPeriodKey,
        startDate: grant.startDate,
        endDate: grant.endDate,
        scopeLabel: payload.scope.scopeLabel,
        dailyRecorded: payload.dailyRecorded,
        dailyInScope: payload.dailyInScope,
        weeklyIncluded: payload.weeklyIncluded,
        weeklyCount: payload.weeklyCount,
        contentJson: payload.content,
        snapshotSubmissionIds: payload.submissionIds,
      },
    });

    return { grant: updatedGrant, report };
  });

  await writeAuditLog({
    actorId: params.userId,
    entityType: "CheckInShareGrant",
    entityId: grant.id,
    action: "SHARE_ACCEPTED",
    metadata: { reportId: result.report.id },
  });

  return result;
}

export async function getShareReportForCoach(reportId: string, coachId: string) {
  const report = await prisma.checkInShareReport.findUnique({
    where: { id: reportId },
    include: {
      session: { select: { sessionNo: true, title: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!report) {
    throw new ApiError("Share report not found", 404, "REPORT_NOT_FOUND");
  }

  if (report.coachId !== coachId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  return {
    ...report,
    content: parseReportContent(report.contentJson),
  };
}

export async function getShareReportForSession(sessionId: string, coachId: string) {
  const report = await prisma.checkInShareReport.findUnique({
    where: { sessionId },
    include: {
      session: { select: { sessionNo: true, title: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!report || report.coachId !== coachId) {
    return null;
  }

  return {
    ...report,
    content: parseReportContent(report.contentJson),
  };
}

export async function listPendingShareGrantsForUser(userId: string) {
  const grants = await prisma.checkInShareGrant.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    include: {
      coach: { select: { name: true, email: true } },
      session: { select: { sessionNo: true, title: true } },
    },
  });

  return grants.map((grant) => ({
    id: grant.id,
    coachName: grant.coach.name ?? grant.coach.email,
    sessionNo: grant.session.sessionNo,
    sessionTitle: grant.session.title,
    requestedAt: grant.requestedAt.toISOString(),
  }));
}

export { shareGrantStatusLabel } from "@/lib/checkin-share/labels";
