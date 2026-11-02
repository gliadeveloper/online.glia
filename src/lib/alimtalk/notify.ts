import "server-only";

import { getSensAlimtalkConfig } from "@/lib/alimtalk/config";
import { cancelAlimtalkReservation, sendAlimtalk } from "@/lib/alimtalk/send";
import {
  faqReplyMessage,
  formatSupplyList,
  liveMessage,
  signupMessage,
  type LiveReminderCode,
} from "@/lib/alimtalk/templates";
import { prisma } from "@/lib/prisma";

const LIVE_OFFSET_MS: Record<LiveReminderCode, number> = {
  LIVEDAY: 24 * 60 * 60 * 1000,
  LIVEHOUR: 60 * 60 * 1000,
  LIVE15MIN: 15 * 60 * 1000,
};

const TEN_MINUTES_MS = 10 * 60 * 1000;

export async function sendSignupAlimtalk(userId: string) {
  if (!getSensAlimtalkConfig()) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneNumber: true, name: true, nickname: true },
  });
  if (!user?.phoneNumber) return;

  const message = signupMessage(displayName(user));
  await sendAlimtalk({
    templateCode: message.templateCode,
    messages: [
      {
        phoneNumber: user.phoneNumber,
        content: message.content,
        title: message.title,
        buttons: message.buttons,
      },
    ],
  });
}

export async function sendFaqReplyAlimtalk(questionId: string, replyBody: string) {
  if (!getSensAlimtalkConfig()) return;
  const question = await prisma.discussion.findUnique({
    where: { id: questionId },
    select: {
      title: true,
      userId: true,
      courseId: true,
      lessonId: true,
      user: { select: { phoneNumber: true, name: true, nickname: true } },
      course: { select: { title: true } },
    },
  });
  if (!question?.lessonId || !question.user.phoneNumber) return;

  const message = faqReplyMessage({
    name: displayName(question.user),
    className: clip(question.course.title, 80),
    title: clip(question.title, 40),
    summaryBody: excerpt(replyBody),
    link: `learning/${question.courseId}/lessons/${question.lessonId}`,
  });
  await sendAlimtalk({
    templateCode: message.templateCode,
    messages: [
      {
        phoneNumber: question.user.phoneNumber,
        content: message.content,
        buttons: message.buttons,
      },
    ],
  });
}

export async function syncLessonLiveReminders(lessonId: string) {
  if (!getSensAlimtalkConfig()) return;
  const lesson = await loadLiveLesson(lessonId);
  if (!lesson?.scheduledStartAt) return;
  await cancelLessonReservations(lessonId);
  await reserveLiveReminders(lesson, null);
}

export async function scheduleLiveRemindersForUser(userId: string, courseIds: string[]) {
  if (!getSensAlimtalkConfig() || courseIds.length === 0) return;
  const lessons = await prisma.lesson.findMany({
    where: {
      type: "LIVE",
      scheduledStartAt: { gt: new Date() },
      module: { courseId: { in: courseIds } },
    },
    select: liveLessonSelect,
  });
  for (const lesson of lessons) {
    if (!lesson.scheduledStartAt) continue;
    await reserveLiveReminders(lesson, userId);
  }
}

async function reserveLiveReminders(
  lesson: NonNullable<Awaited<ReturnType<typeof loadLiveLesson>>>,
  onlyUserId: string | null,
) {
  const start = lesson.scheduledStartAt;
  if (!start) return;
  const learners = lesson.module.course.enrollments
    .map((enrollment) => enrollment.user)
    .filter((user) => user.phoneNumber && user.status === "ACTIVE" && (!onlyUserId || user.id === onlyUserId));
  if (learners.length === 0) return;

  const className = clip(`${lesson.module.course.title} ${lesson.title}`.replace(/\s+/g, " ").trim(), 80);
  const startTime = formatSeoul(start);
  const list = formatSupplyList(lesson.supplies);
  const id = `${lesson.module.course.id}/lessons/${lesson.id}`;

  for (const code of Object.keys(LIVE_OFFSET_MS) as LiveReminderCode[]) {
    const reserveAt = new Date(start.getTime() - LIVE_OFFSET_MS[code]);
    if (reserveAt.getTime() - Date.now() < TEN_MINUTES_MS) continue;

    const pending = [];
    for (const user of learners) {
      const existing = await prisma.alimtalkReservation.findUnique({
        where: { lessonId_userId_templateCode: { lessonId: lesson.id, userId: user.id, templateCode: code } },
        select: { id: true },
      });
      if (!existing && user.phoneNumber) pending.push(user);
    }
    if (pending.length === 0) continue;

    for (let index = 0; index < pending.length; index += 100) {
      const chunk = pending.slice(index, index + 100);
      const rendered = chunk.map((user) =>
        liveMessage(code, { name: displayName(user), className, startTime, list, id }),
      );
      const result = await sendAlimtalk({
        templateCode: code,
        reserveTime: formatReserve(reserveAt),
        messages: chunk.map((user, messageIndex) => ({
          phoneNumber: user.phoneNumber!,
          content: rendered[messageIndex]!.content,
          buttons: rendered[messageIndex]!.buttons,
        })),
      });
      await prisma.alimtalkReservation.createMany({
        data: chunk.map((user) => ({
          lessonId: lesson.id,
          userId: user.id,
          templateCode: code,
          requestId: result.requestId,
          reserveAt,
        })),
        skipDuplicates: true,
      });
    }
  }
}

export async function setLessonScheduledStart(
  lessonId: string,
  startsAt: string,
  supplies?: string[],
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, type: true },
  });
  if (!lesson || lesson.type !== "LIVE") return;

  const scheduledStartAt = parseSeoulStart(startsAt);
  if (scheduledStartAt.getTime() <= Date.now()) {
    throw new Error("LIVE_START_IN_PAST");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      scheduledStartAt,
      ...(supplies !== undefined ? { supplies } : {}),
    },
  });
  await syncLessonLiveReminders(lessonId);
}

async function cancelLessonReservations(lessonId: string) {
  const rows = await prisma.alimtalkReservation.findMany({
    where: { lessonId },
    select: { requestId: true },
  });
  const requestIds = [...new Set(rows.map((row) => row.requestId))];
  for (const requestId of requestIds) {
    try {
      await cancelAlimtalkReservation(requestId);
    } catch (error) {
      console.error("[alimtalk] reservation cancel failed", error instanceof Error ? error.message : error);
    }
  }
  await prisma.alimtalkReservation.deleteMany({ where: { lessonId } });
}

const liveLessonSelect = {
  id: true,
  title: true,
  scheduledStartAt: true,
  supplies: true,
  module: {
    select: {
      course: {
        select: {
          id: true,
          title: true,
          enrollments: {
            where: { status: "ACTIVE" as const },
            select: {
              user: { select: { id: true, phoneNumber: true, name: true, nickname: true, status: true } },
            },
          },
        },
      },
    },
  },
};

function loadLiveLesson(lessonId: string) {
  return prisma.lesson.findUnique({ where: { id: lessonId }, select: liveLessonSelect });
}

function displayName(user: { name: string | null; nickname: string | null }) {
  return clip(user.nickname?.trim() || user.name?.trim() || "회원", 20);
}

function clip(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return [...text].slice(0, maxLength).join("");
}

function excerpt(body: string) {
  const text = body
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clip(text || "답변이 등록되었습니다", 40);
}

function formatSeoul(date: Date) {
  const parts = seoulParts(date);
  return `${Number(parts.month)}월 ${Number(parts.day)}일 ${parts.hour}:${parts.minute}`;
}

function formatReserve(date: Date) {
  const parts = seoulParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function parseSeoulStart(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("LIVE_START_INVALID");
  const instant = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+09:00`);
  if (Number.isNaN(instant.getTime())) throw new Error("LIVE_START_INVALID");
  return instant;
}

function seoulParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") === "24" ? "00" : read("hour"),
    minute: read("minute"),
  };
}

export async function scheduleLiveRemindersForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      lines: {
        select: {
          product: { select: { items: { select: { kind: true, courseId: true } } } },
        },
      },
    },
  });
  if (!order) return;
  const courseIds = order.lines.flatMap((line) => courseIdsFromProduct(line.product));
  await scheduleLiveRemindersForUser(order.userId, courseIds);
}

export async function reportLiveReminders(orderId: string) {
  try {
    await scheduleLiveRemindersForOrder(orderId);
  } catch (error) {
    console.error("[alimtalk] live enrollment", error instanceof Error ? error.message : error);
  }
}

export function courseIdsFromProduct(product: {
  items: Array<{ kind: string; courseId: string | null }>;
}) {
  return product.items.flatMap((item) => (item.kind === "COURSE_ACCESS" && item.courseId ? [item.courseId] : []));
}
