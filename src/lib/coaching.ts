import type {
  CoachingSessionPublicationStatus,
  Prisma,
} from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { coachProfileSelect } from "@/lib/coaching-display";
import { prisma } from "@/lib/prisma";
import { createCoachingCommentNotification } from "@/lib/home-notifications";

export type CoachingSessionDisplayState = "UPCOMING" | "PREPARING" | "PUBLISHED";

export function getSessionDisplayState(session: {
  publicationStatus: CoachingSessionPublicationStatus;
  scheduledAt: Date;
}): CoachingSessionDisplayState {
  if (session.publicationStatus === "PUBLISHED") {
    return "PUBLISHED";
  }

  return session.scheduledAt > new Date() ? "UPCOMING" : "PREPARING";
}

export function formatOpenDateLabel(scheduledAt: Date) {
  return scheduledAt.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export function getSessionDisplayLabel(session: {
  publicationStatus: CoachingSessionPublicationStatus;
  scheduledAt: Date;
}) {
  const state = getSessionDisplayState(session);

  if (state === "PUBLISHED") {
    return "오픈됨";
  }

  if (state === "UPCOMING") {
    return `${formatOpenDateLabel(session.scheduledAt)} 오픈됩니다`;
  }

  return "아직 등록된 코칭이 없습니다";
}

export const sessionListInclude = {
  coach: { select: { id: true, name: true, email: true } },
  progress: true,
  conversation: {
    select: {
      id: true,
      messages: {
        where: { awaitingReply: true },
        select: { id: true },
      },
    },
  },
} satisfies Prisma.CoachingSessionInclude;

export const sessionDetailInclude = {
  coach: { select: coachProfileSelect },
  progress: true,
  entitlement: {
    select: {
      id: true,
      totalSessions: true,
      completedSessions: true,
      validUntil: true,
      status: true,
      coachingOffering: { select: { title: true, slug: true } },
    },
  },
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
} satisfies Prisma.CoachingSessionInclude;

export async function getCoachingSessionForUser(sessionId: string, userId: string) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: sessionId },
    include: sessionDetailInclude,
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (session.userId !== userId && session.coachId !== userId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  return session;
}

export async function markSessionViewed(sessionId: string, userId: string) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, publicationStatus: true },
  });

  if (!session) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (session.userId !== userId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (session.publicationStatus !== "PUBLISHED") {
    throw new ApiError("Session is not published yet", 409, "SESSION_NOT_PUBLISHED");
  }

  const now = new Date();

  return prisma.coachingSessionProgress.upsert({
    where: { sessionId: session.id },
    update: {
      status: "IN_PROGRESS",
    },
    create: {
      sessionId: session.id,
      userId,
      status: "IN_PROGRESS",
      firstViewedAt: now,
    },
  });
}

export async function sendCoachingMessage(params: {
  sessionId: string;
  authorId: string;
  bodyMarkdown: string;
}) {
  const body = params.bodyMarkdown.trim();
  if (!body) {
    throw new ApiError("bodyMarkdown is required", 400, "VALIDATION_ERROR");
  }

  const session = await prisma.coachingSession.findUnique({
    where: { id: params.sessionId },
    include: { conversation: true },
  });

  if (!session?.conversation) {
    throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
  }

  if (session.publicationStatus !== "PUBLISHED") {
    throw new ApiError("Q&A is available after session is published", 409, "SESSION_NOT_PUBLISHED");
  }

  const isStudent = session.userId === params.authorId;
  const isCoach = session.coachId === params.authorId;

  if (!isStudent && !isCoach) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  const authorRole = isCoach ? "COACH" : "STUDENT";

  return prisma.$transaction(async (tx) => {
    if (isCoach) {
      const pending = await tx.coachingSessionMessage.findFirst({
        where: {
          conversationId: session.conversation!.id,
          authorRole: "STUDENT",
          awaitingReply: true,
        },
        orderBy: { createdAt: "asc" },
      });

      if (pending) {
        await tx.coachingSessionMessage.update({
          where: { id: pending.id },
          data: {
            awaitingReply: false,
            answeredAt: new Date(),
          },
        });
      }
    }

    const message = await tx.coachingSessionMessage.create({
      data: {
        conversationId: session.conversation!.id,
        authorId: params.authorId,
        authorRole,
        bodyMarkdown: body,
        awaitingReply: authorRole === "STUDENT",
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.coachingSessionConversation.update({
      where: { id: session.conversation!.id },
      data: { lastMessageAt: message.createdAt },
    });

    if (authorRole === "COACH") {
      await createCoachingCommentNotification(tx, {
        messageId: message.id,
        userId: session.userId,
        occurredAt: message.createdAt,
      });
    }

    return message;
  });
}
