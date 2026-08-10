import { getCheckInDate, getWeekPeriodKey } from "@/lib/forms";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCheckInDateKey(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
}

export function parseCheckInDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

export function addDaysToDateKey(dateKey: string, days: number, timezone = "Asia/Seoul") {
  const date = parseCheckInDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return getCheckInDate(timezone, date);
}

/** Seven days centered on `centerDateKey` (−3 … +3). Includes future dates. */
export function buildCenteredDayStrip(centerDateKey: string, timezone = "Asia/Seoul") {
  const days: string[] = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    days.push(addDaysToDateKey(centerDateKey, offset, timezone));
  }
  return days;
}

/** Inclusive day strip ending at `endDateKey` (today). No future days. */
export function buildDayStrip(endDateKey: string, count = 7, timezone = "Asia/Seoul") {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(addDaysToDateKey(endDateKey, -offset, timezone));
  }
  return days;
}

/** Week keys (Monday anchors) ending at current week. No future weeks. */
export function buildWeekStrip(currentWeekKey: string, count = 8, timezone = "Asia/Seoul") {
  const weeks: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    weeks.push(addDaysToDateKey(currentWeekKey, -offset * 7, timezone));
  }
  return weeks;
}

export function isFutureDailyDate(dateKey: string, timezone: string) {
  const today = getCheckInDate(timezone);
  return dateKey > today;
}

export function isFutureWeeklyPeriod(dateKey: string, timezone: string) {
  const weekKey = getWeekPeriodKey(timezone, parseCheckInDateKey(dateKey));
  const currentWeekKey = getWeekPeriodKey(timezone);
  return weekKey > currentWeekKey;
}

export function formatCheckInListDate(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseCheckInDateKey(dateKey));
}

export function formatCheckInPageDate(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(parseCheckInDateKey(dateKey));
}

export function formatCheckInDayOfMonth(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
  }).format(parseCheckInDateKey(dateKey));
}

export function formatCheckInShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(parseCheckInDateKey(dateKey));
}

export function formatCheckInWeekdayShort(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    weekday: "short",
  }).format(parseCheckInDateKey(dateKey));
}

/** Monday (inclusive) – Sunday range for a week anchored on Monday. */
export function formatWeekRangeLabel(weekStartKey: string) {
  const start = parseCheckInDateKey(weekStartKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(start);

  const endLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(end);

  return `${startLabel} – ${endLabel}`;
}

export function formatWeekStripLabel(weekStartKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(parseCheckInDateKey(weekStartKey));
}

export type CheckInTab = "daily" | "weekly";

export function parseCheckInTab(value: string | undefined): CheckInTab {
  return value === "weekly" ? "weekly" : "daily";
}

export function getWeekdayEnShort(dateKey: string, timezone = "Asia/Seoul") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(parseCheckInDateKey(dateKey));
}

export function isSundayDateKey(dateKey: string, timezone = "Asia/Seoul") {
  return getWeekdayEnShort(dateKey, timezone) === "Sun";
}

/** Weekly check-in forms open for new submissions on Sundays only. */
export function isWeeklyCheckInWritableDay(dateKey: string, timezone = "Asia/Seoul") {
  return isSundayDateKey(dateKey, timezone);
}

export function checkInHubHref() {
  return "/checkin";
}
