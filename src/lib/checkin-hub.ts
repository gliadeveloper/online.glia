import {
  formDetailInclude,
  getCheckInDate,
  getWeekPeriodKey,
  listFormSubmissionHistory,
  resolvePeriodKey,
} from "@/lib/forms";
import {
  buildCenteredDayStrip,
  formatCheckInListDate,
  formatWeekRangeLabel,
  isFutureDailyDate,
  isFutureWeeklyPeriod,
  isWeeklyCheckInWritableDay,
} from "@/lib/checkin-dates";
import { resolveCheckInHref } from "@/lib/checkin-routes";
import { getCalendarWeekRecord } from "@/lib/checkin-hub-ui";
import {
  calculateDailyStreak,
  resolveStreakHeadline,
  streakHeadlineText,
} from "@/lib/checkin-streak";
import { prisma } from "@/lib/prisma";

export const CHECKIN_HISTORY_PAGE_SIZE = 20;
export const CHECKIN_HUB_RECENT_LIMIT = 5;

export async function getCheckInHubData(userId: string) {
  const [dailyForm, weeklyForm] = await Promise.all([
    prisma.form.findFirst({
      where: { slug: "daily-checkin", status: "PUBLISHED" },
      include: formDetailInclude,
    }),
    prisma.form.findFirst({
      where: { slug: "weekly-checkin", status: "PUBLISHED" },
      include: formDetailInclude,
    }),
  ]);

  const timezone = dailyForm?.timezone ?? weeklyForm?.timezone ?? "Asia/Seoul";
  const today = getCheckInDate(timezone);
  const currentWeekKey = getWeekPeriodKey(timezone);
  const isWeeklyWritableToday = isWeeklyCheckInWritableDay(today, timezone);

  const [dailyHistory, weeklyHistory] = await Promise.all([
    dailyForm
      ? listFormSubmissionHistory({ formId: dailyForm.id, userId, limit: 60 })
      : Promise.resolve([]),
    weeklyForm
      ? listFormSubmissionHistory({ formId: weeklyForm.id, userId, limit: 24 })
      : Promise.resolve([]),
  ]);

  const dailyRecorded = new Set(dailyHistory.map((item) => item.checkInDate));
  const weeklyRecorded = new Set(weeklyHistory.map((item) => item.checkInDate));

  const todayDailyDone = dailyRecorded.has(today);
  const currentWeekDone = weeklyRecorded.has(currentWeekKey);

  const streak = calculateDailyStreak({ today, timezone, recordedDates: dailyRecorded });
  const streakHeadline = resolveStreakHeadline({ todayDailyDone, streak });

  const dayStrip = buildCenteredDayStrip(today, timezone).map((dateKey) => {
    const isFuture = isFutureDailyDate(dateKey, timezone);
    const isRecorded = dailyRecorded.has(dateKey);

    return {
      dateKey,
      isToday: dateKey === today,
      isFuture,
      isRecorded,
      href: isFuture ? null : resolveCheckInHref("daily", dateKey, isRecorded),
    };
  });

  const recentHistory = buildMergedHistoryPreview({
    dailyHistory,
    weeklyHistory,
    limit: CHECKIN_HUB_RECENT_LIMIT,
  });

  const weekRecord = getCalendarWeekRecord({
    today,
    timezone,
    recordedDates: dailyRecorded,
  });

  return {
    timezone,
    today,
    currentWeekKey,
    isWeeklyWritableToday,
    dailyForm,
    weeklyForm,
    todayDailyDone,
    currentWeekDone,
    streak,
    streakHeadline,
    streakTitle: streakHeadlineText(streakHeadline),
    dayStrip,
    weekRecord,
    recentHistory,
    dailyTask: {
      label: "데일리 체크",
      done: todayDailyDone,
      href: resolveCheckInHref("daily", today, todayDailyDone),
    },
    weeklyTask: weeklyForm
      ? {
          label: "주간 체크",
          done: currentWeekDone,
          href: resolveCheckInHref("weekly", currentWeekKey, currentWeekDone),
          writable: isWeeklyWritableToday && !currentWeekDone,
          lockedHint: !currentWeekDone && !isWeeklyWritableToday ? "일요일에 작성할 수 있어요" : null,
        }
      : null,
  };
}

export type CheckInHubData = Awaited<ReturnType<typeof getCheckInHubData>>;

export type CheckInMergedHistoryItem = {
  id: string;
  kind: "daily" | "weekly";
  href: string;
  title: string;
  subtitle?: string;
  sortKey: string;
};

function buildMergedHistoryPreview(params: {
  dailyHistory: Awaited<ReturnType<typeof listFormSubmissionHistory>>;
  weeklyHistory: Awaited<ReturnType<typeof listFormSubmissionHistory>>;
  limit: number;
}): CheckInMergedHistoryItem[] {
  const dailyItems: CheckInMergedHistoryItem[] = params.dailyHistory.map((item) => ({
    id: item.id,
    kind: "daily" as const,
    href: resolveCheckInHref("daily", item.checkInDate, true),
    title: formatCheckInListDate(item.checkInDate),
    subtitle: "데일리",
    sortKey: item.checkInDate,
  }));

  const weeklyItems: CheckInMergedHistoryItem[] = params.weeklyHistory.map((item) => ({
    id: item.id,
    kind: "weekly" as const,
    href: resolveCheckInHref("weekly", item.checkInDate, true),
    title: formatWeekRangeLabel(item.checkInDate),
    subtitle: "주간",
    sortKey: item.checkInDate,
  }));

  return [...dailyItems, ...weeklyItems]
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, params.limit);
}

export async function getCheckInHistoryPage(userId: string, page: number) {
  const [dailyForm, weeklyForm] = await Promise.all([
    prisma.form.findFirst({
      where: { slug: "daily-checkin", status: "PUBLISHED" },
      select: { id: true },
    }),
    prisma.form.findFirst({
      where: { slug: "weekly-checkin", status: "PUBLISHED" },
      select: { id: true },
    }),
  ]);

  const formIds = [dailyForm?.id, weeklyForm?.id].filter((id): id is string => Boolean(id));

  if (formIds.length === 0) {
    return {
      items: [] as CheckInMergedHistoryItem[],
      total: 0,
      page,
      pageSize: CHECKIN_HISTORY_PAGE_SIZE,
    };
  }

  const where = { userId, formId: { in: formIds } };
  const pageSize = CHECKIN_HISTORY_PAGE_SIZE;
  const safePage = Math.max(1, page);

  const [submissions, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where,
      orderBy: [{ checkInDate: "desc" }, { submittedAt: "desc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      include: {
        form: { select: { schedule: true } },
      },
    }),
    prisma.formSubmission.count({ where }),
  ]);

  const items: CheckInMergedHistoryItem[] = submissions.map((item) => {
    const isWeekly = item.form.schedule === "WEEKLY";

    return {
      id: item.id,
      kind: isWeekly ? "weekly" : "daily",
      href: resolveCheckInHref(isWeekly ? "weekly" : "daily", item.checkInDate, true),
      title: isWeekly
        ? formatWeekRangeLabel(item.checkInDate)
        : formatCheckInListDate(item.checkInDate),
      subtitle: isWeekly ? "주간" : "데일리",
      sortKey: item.checkInDate,
    };
  });

  return { items, total, page: safePage, pageSize };
}

export type CheckInHistoryPageData = Awaited<ReturnType<typeof getCheckInHistoryPage>>;

/** Re-export for form pages — period access guard. */
export function assertCheckInPeriodAccessible(params: {
  schedule: "DAILY" | "WEEKLY" | "ONCE" | string;
  timezone: string;
  periodDate: string;
}) {
  if (params.schedule === "WEEKLY") {
    if (isFutureWeeklyPeriod(params.periodDate, params.timezone)) {
      return { ok: false as const, reason: "future_week" as const };
    }
    return { ok: true as const };
  }

  if (isFutureDailyDate(params.periodDate, params.timezone)) {
    return { ok: false as const, reason: "future_day" as const };
  }

  return { ok: true as const };
}

export { resolvePeriodKey };
