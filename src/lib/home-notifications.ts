import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

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

export async function createLiveStartedNotification(
  tx: Db,
  params: { liveSessionId: string; recipientIds: string[]; occurredAt: Date },
) {
  const event = await tx.notificationEvent.upsert({
    where: { liveSessionId: params.liveSessionId },
    update: {},
    create: { type: "LIVE_STARTED", liveSessionId: params.liveSessionId, occurredAt: params.occurredAt },
  });
  if (params.recipientIds.length > 0) {
    await tx.notificationDelivery.createMany({
      data: params.recipientIds.map((userId) => ({ eventId: event.id, userId })),
      skipDuplicates: true,
    });
  }
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

export async function markLiveNotificationsRead(userId: string, lessonId: string) {
  await prisma.notificationDelivery.updateMany({
    where: { userId, readAt: null, event: { liveSession: { lessonId } } },
    data: { readAt: new Date() },
  });
}

export type HomeNotification = {
  id: string;
  kind: "live" | "comment" | "session";
  label: string;
  title: string;
  href: string;
  occurredAt: Date;
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
      ],
    },
    orderBy: { event: { occurredAt: "desc" } },
    include: {
      event: {
        include: {
          coachingSession: { select: { id: true, title: true } },
          coachingMessage: {
            select: { conversation: { select: { session: { select: { id: true, title: true } } } } },
          },
          liveSession: {
            select: { lesson: { select: { id: true, title: true, module: { select: { course: { select: { slug: true } } } } } } },
          },
        },
      },
    },
  });

  return deliveries.map(({ id, event }) => {
    if (event.type === "LIVE_STARTED" && event.liveSession) {
      const lesson = event.liveSession.lesson;
      return { id, kind: "live" as const, label: "지금 라이브 진행 중", title: lesson.title, href: `/learning/${lesson.module.course.slug}/lessons/${lesson.id}`, occurredAt: event.occurredAt };
    }
    const session = event.coachingSession ?? event.coachingMessage?.conversation.session;
    if (!session) throw new Error("Notification event source is missing");
    return event.type === "COACHING_COMMENT"
      ? { id, kind: "comment" as const, label: "새 코치 코멘트", title: session.title, href: `/coaching/sessions/${session.id}`, occurredAt: event.occurredAt }
      : { id, kind: "session" as const, label: "새 코칭 회차", title: session.title, href: `/coaching/sessions/${session.id}`, occurredAt: event.occurredAt };
  }).sort((a, b) => {
    const priority = { live: 0, comment: 1, session: 2 };
    return priority[a.kind] - priority[b.kind] || b.occurredAt.getTime() - a.occurredAt.getTime();
  });
}
