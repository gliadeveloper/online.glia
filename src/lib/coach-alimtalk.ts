import { formatSupplyList, liveMessage, type LiveReminderCode } from "@/lib/alimtalk/templates";
import { formatPhoneNumber } from "@/lib/member-contact";
import { prisma } from "@/lib/prisma";

const TEMPLATE_ORDER: LiveReminderCode[] = ["LIVEDAY", "LIVEHOUR", "LIVE15MIN"];

const TEMPLATE_LABEL: Record<LiveReminderCode, string> = {
  LIVEDAY: "하루 전",
  LIVEHOUR: "1시간 전",
  LIVE15MIN: "15분 전",
};

export type CoachAlimtalkRecipient = {
  userId: string;
  name: string;
  phone: string;
};

export type CoachAlimtalkMessage = {
  templateCode: LiveReminderCode;
  label: string;
  reserveAt: Date | null;
  preview: string;
  recipients: CoachAlimtalkRecipient[];
};

export type CoachAlimtalkLesson = {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  startsAt: Date;
  supplies: string[];
  supplyList: string;
  recipients: CoachAlimtalkRecipient[];
  messages: CoachAlimtalkMessage[];
};

function displayName(user: { name: string | null; nickname: string | null }) {
  return user.nickname?.trim() || user.name?.trim() || "회원";
}

function formatSeoul(date: Date) {
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
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${Number(read("month"))}월 ${Number(read("day"))}일 ${hour}:${read("minute")}`;
}

export async function listCoachAlimtalkLessons(coachId: string): Promise<CoachAlimtalkLesson[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      type: "LIVE",
      scheduledStartAt: { not: null },
      module: { course: { instructorId: coachId } },
    },
    select: {
      id: true,
      title: true,
      scheduledStartAt: true,
      supplies: true,
      module: { select: { course: { select: { id: true, title: true } } } },
      alimtalkReservations: {
        orderBy: { reserveAt: "asc" },
        select: {
          templateCode: true,
          reserveAt: true,
          user: { select: { id: true, nickname: true, name: true, phoneNumber: true } },
        },
      },
    },
    orderBy: { scheduledStartAt: "asc" },
  });

  return lessons.flatMap((lesson) => {
    if (!lesson.scheduledStartAt) return [];
    const course = lesson.module.course;
    const className = [...`${course.title} ${lesson.title}`.replace(/\s+/g, " ").trim()].slice(0, 80).join("");
    const startTime = formatSeoul(lesson.scheduledStartAt);
    const supplyList = formatSupplyList(lesson.supplies);
    const linkId = `${course.id}/lessons/${lesson.id}`;

    const recipients = uniqueRecipients(lesson.alimtalkReservations.map((row) => row.user));
    const messages = TEMPLATE_ORDER.map((templateCode) => {
      const rows = lesson.alimtalkReservations.filter((row) => row.templateCode === templateCode);
      const messageRecipients = uniqueRecipients(rows.map((row) => row.user));
      const sampleName = messageRecipients[0]?.name ?? recipients[0]?.name ?? "회원";
      return {
        templateCode,
        label: TEMPLATE_LABEL[templateCode],
        reserveAt: rows[0]?.reserveAt ?? null,
        preview: liveMessage(templateCode, {
          name: sampleName,
          className,
          startTime,
          list: supplyList,
          id: linkId,
        }).content,
        recipients: messageRecipients,
      };
    });

    return [
      {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        courseTitle: course.title,
        startsAt: lesson.scheduledStartAt,
        supplies: lesson.supplies,
        supplyList,
        recipients,
        messages,
      },
    ];
  });
}

function uniqueRecipients(
  users: Array<{ id: string; nickname: string | null; name: string | null; phoneNumber: string | null }>,
) {
  const seen = new Set<string>();
  const recipients: CoachAlimtalkRecipient[] = [];
  for (const user of users) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    recipients.push({
      userId: user.id,
      name: displayName(user),
      phone: formatPhoneNumber(user.phoneNumber) || "번호 없음",
    });
  }
  return recipients;
}
