import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  COACHING_LOG_MAX_LENGTH,
  COACHING_LOG_MAX_PER_SESSION,
} from "@/lib/coaching-session-log-limits";

export { COACHING_LOG_MAX_LENGTH, COACHING_LOG_MAX_PER_SESSION } from "@/lib/coaching-session-log-limits";

export function coachingLogSelect() {
  return {
    id: true,
    body: true,
    createdAt: true,
  } as const;
}

export async function listCoachingSessionLogs(sessionId: string) {
  return prisma.coachingSessionLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    select: coachingLogSelect(),
  });
}

export async function createCoachingSessionLog(params: {
  sessionId: string;
  authorId: string;
  body: string;
}) {
  const body = params.body.replace(/\s+/g, " ").trim();
  if (!body) {
    throw new ApiError("한줄 기록을 입력해 주세요.", 400, "VALIDATION_ERROR");
  }
  if (body.length > COACHING_LOG_MAX_LENGTH) {
    throw new ApiError(`한줄 기록은 ${COACHING_LOG_MAX_LENGTH}자까지입니다.`, 400, "VALIDATION_ERROR");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.coachingSession.findUnique({
      where: { id: params.sessionId },
      select: {
        id: true,
        userId: true,
        publicationStatus: true,
      },
    });

    if (!session) {
      throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
    }

    if (session.userId !== params.authorId) {
      throw new ApiError("Forbidden", 403, "FORBIDDEN");
    }

    if (session.publicationStatus !== "PUBLISHED") {
      throw new ApiError("한줄 기록은 발행된 회차에서만 남길 수 있습니다.", 409, "SESSION_NOT_PUBLISHED");
    }

    const logCount = await tx.coachingSessionLog.count({
      where: { sessionId: session.id },
    });

    if (logCount >= COACHING_LOG_MAX_PER_SESSION) {
      throw new ApiError(
        `한줄 기록은 회차당 ${COACHING_LOG_MAX_PER_SESSION}개까지입니다.`,
        409,
        "LOG_LIMIT_REACHED",
      );
    }

    return tx.coachingSessionLog.create({
      data: {
        sessionId: session.id,
        userId: params.authorId,
        body,
      },
      select: coachingLogSelect(),
    });
  });
}

export async function deleteCoachingSessionLog(params: {
  sessionId: string;
  logId: string;
  authorId: string;
}) {
  const log = await prisma.coachingSessionLog.findUnique({
    where: { id: params.logId },
    select: { id: true, sessionId: true, userId: true },
  });

  if (!log || log.sessionId !== params.sessionId) {
    throw new ApiError("한줄 기록을 찾을 수 없습니다.", 404, "LOG_NOT_FOUND");
  }

  if (log.userId !== params.authorId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  await prisma.coachingSessionLog.delete({ where: { id: log.id } });
}
