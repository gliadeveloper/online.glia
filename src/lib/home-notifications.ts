import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { formatPostRelativeTime } from "@/lib/post-content";

type Db = Prisma.TransactionClient;

export async function createCoachingPublishedNotification(
  tx: Db,
  params: { sessionId: string; userId: string; occurredAt: Date },
) {
  const event = await tx.notificationEvent.upsert({
    where: { coachingSessionId: params.sessionId },
    update: {},
    create: {
      type: "COACHING_SESSION_PUBLISHED",
      coachingSessionId: params.sessionId,
      occurredAt: params.occurredAt,
    },
  });

  await tx.notificationDelivery.upsert({
    where: { eventId_userId: { eventId: event.id, userId: params.userId } },
    update: {},
    create: { eventId: event.id, userId: params.userId },
  });
}

export async function createCoachingCommentNotification(
  tx: Db,
  params: { messageId: string; userId: string; occurredAt: Date },
) {
  const event = await tx.notificationEvent.upsert({
    where: { coachingMessageId: params.messageId },
    update: {},
    create: {
      type: "COACHING_COMMENT",
      coachingMessageId: params.messageId,
      occurredAt: params.occurredAt,
    },
  });

  await tx.notificationDelivery.upsert({
    where: { eventId_userId: { eventId: event.id, userId: params.userId } },
    update: {},
    create: { eventId: event.id, userId: params.userId },
  });
}

export async function createLessonQuestionNotification(
  tx: Db,
  params: { discussionId: string; userId: string; occurredAt: Date },
) {
  const event = await tx.notificationEvent.upsert({
    where: { discussionId: params.discussionId },
    update: {},
    create: {
      type: "LESSON_QUESTION",
      discussionId: params.discussionId,
      occurredAt: params.occurredAt,
    },
  });

  await tx.notificationDelivery.upsert({
    where: { eventId_userId: { eventId: event.id, userId: params.userId } },
    update: { readAt: null },
    create: { eventId: event.id, userId: params.userId },
  });
}

export async function createLessonQuestionReplyNotification(
  tx: Db,
  params: { replyId: string; userId: string; occurredAt: Date },
) {
  const event = await tx.notificationEvent.upsert({
    where: { discussionReplyId: params.replyId },
    update: {},
    create: {
      type: "LESSON_QUESTION_REPLY",
      discussionReplyId: params.replyId,
      occurredAt: params.occurredAt,
    },
  });

  await tx.notificationDelivery.upsert({
    where: { eventId_userId: { eventId: event.id, userId: params.userId } },
    update: { readAt: null },
    create: { eventId: event.id, userId: params.userId },
  });
}

export async function createLiveStartedNotification(
  tx: Db,
  params: { liveSessionId: string; recipientIds: string[]; occurredAt: Date },
) {
  const event = await tx.notificationEvent.upsert({
    where: { liveSessionId: params.liveSessionId },
    update: {},
    create: {
      type: "LIVE_STARTED",
      liveSessionId: params.liveSessionId,
      occurredAt: params.occurredAt,
    },
  });

  if (params.recipientIds.length === 0) {
    return;
  }

  await tx.notificationDelivery.createMany({
    data: params.recipientIds.map((userId) => ({ eventId: event.id, userId })),
    skipDuplicates: true,
  });
}

export async function markCoachingNotificationsRead(userId: string, sessionId: string) {
  await prisma.notificationDelivery.updateMany({
    where: {
      userId,
      readAt: null,
      OR: [
        { event: { coachingSessionId: sessionId } },
        { event: { coachingMessage: { conversation: { sessionId } } } },
      ],
    },
    data: { readAt: new Date() },
  });
}

export async function markLessonQuestionNotificationRead(userId: string, discussionId: string) {
  await prisma.notificationDelivery.updateMany({
    where: {
      userId,
      readAt: null,
      event: { type: "LESSON_QUESTION", discussionId },
    },
    data: { readAt: new Date() },
  });
}

export async function markLessonQuestionReplyNotificationsRead(userId: string, lessonId: string) {
  await prisma.notificationDelivery.updateMany({
    where: {
      userId,
      readAt: null,
      event: {
        type: "LESSON_QUESTION_REPLY",
        discussionReply: { discussion: { lessonId } },
      },
    },
    data: { readAt: new Date() },
  });
}

export async function markLiveNotificationsRead(userId: string, lessonId: string) {
  await prisma.notificationDelivery.updateMany({
    where: {
      userId,
      readAt: null,
      event: { liveSession: { lessonId } },
    },
    data: { readAt: new Date() },
  });
}

export type HomeNotificationKind = "live" | "comment" | "session" | "question";

export type HomeNotification = {
  id: string;
  kind: HomeNotificationKind;
  label: string;
  title: string;
  href: string;
  occurredAt: Date;
  timeLabel: string;
};

const KIND_PRIORITY: Record<HomeNotificationKind, number> = {
  live: 0,
  comment: 1,
  question: 1,
  session: 2,
};

export async function getHomeNotifications(userId: string): Promise<HomeNotification[]> {
  const deliveries = await prisma.notificationDelivery.findMany({
    where: {
      userId,
      readAt: null,
      OR: [
        { event: { type: "COACHING_SESSION_PUBLISHED" } },
        { event: { type: "COACHING_COMMENT" } },
        { event: { type: "LIVE_STARTED", liveSession: { status: "LIVE" } } },
        { event: { type: "LESSON_QUESTION" } },
        { event: { type: "LESSON_QUESTION_REPLY" } },
      ],
    },
    orderBy: { event: { occurredAt: "desc" } },
    include: {
      event: {
        include: {
          coachingSession: { select: { id: true, title: true } },
          coachingMessage: {
            select: {
              conversation: {
                select: { session: { select: { id: true, title: true } } },
              },
            },
          },
          liveSession: {
            select: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  module: { select: { course: { select: { id: true } } } },
                },
              },
            },
          },
          discussion: {
            select: {
              id: true,
              title: true,
              lessonId: true,
              courseId: true,
            },
          },
          discussionReply: {
            select: {
              discussion: {
                select: {
                  id: true,
                  title: true,
                  lessonId: true,
                  courseId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const items: HomeNotification[] = [];

  for (const { id, event } of deliveries) {
    if (event.type === "LESSON_QUESTION" && event.discussion?.lessonId) {
      items.push({
        id,
        kind: "question",
        label: "새 강의 질문",
        title: event.discussion.title,
        href: `/coach/questions?filter=open&question=${event.discussion.id}`,
        occurredAt: event.occurredAt,
        timeLabel: formatPostRelativeTime(event.occurredAt),
      });
      continue;
    }

    if (event.type === "LESSON_QUESTION_REPLY" && event.discussionReply?.discussion.lessonId) {
      const question = event.discussionReply.discussion;
      items.push({
        id,
        kind: "question",
        label: "내 질문에 새 답변",
        title: question.title,
        href: `/learning/${question.courseId}/lessons/${question.lessonId}#qna-${question.id}`,
        occurredAt: event.occurredAt,
        timeLabel: formatPostRelativeTime(event.occurredAt),
      });
      continue;
    }

    if (event.type === "LIVE_STARTED" && event.liveSession) {
      const lesson = event.liveSession.lesson;
      items.push({
        id,
        kind: "live",
        label: "지금 라이브 진행 중",
        title: lesson.title,
        href: `/learning/${lesson.module.course.id}/lessons/${lesson.id}`,
        occurredAt: event.occurredAt,
        timeLabel: "입장",
      });
      continue;
    }

    const session = event.coachingSession ?? event.coachingMessage?.conversation.session;
    if (!session) {
      continue;
    }

    if (event.type === "COACHING_COMMENT") {
      items.push({
        id,
        kind: "comment",
        label: "새 코치 코멘트",
        title: session.title,
        href: `/coaching/sessions/${session.id}?panel=qna`,
        occurredAt: event.occurredAt,
        timeLabel: formatPostRelativeTime(event.occurredAt),
      });
      continue;
    }

    items.push({
      id,
      kind: "session",
      label: "새 코칭 회차",
      title: session.title,
      href: `/coaching/sessions/${session.id}`,
      occurredAt: event.occurredAt,
      timeLabel: formatPostRelativeTime(event.occurredAt),
    });
  }

  return items.sort((a, b) => {
    const byKind = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (byKind !== 0) {
      return byKind;
    }
    return b.occurredAt.getTime() - a.occurredAt.getTime();
  });
}
