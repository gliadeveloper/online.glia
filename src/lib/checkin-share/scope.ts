import {
  addDaysToDateKey,
  formatCheckInWeekdayShort,
  formatWeekRangeLabel,
  isValidCheckInDateKey,
  parseCheckInDateKey,
} from "@/lib/checkin-dates";
import { getCheckInDate, getWeekPeriodKey } from "@/lib/forms";

export const CHECKIN_SHARE_MAX_RANGE_DAYS = 14;

export type ResolvedShareScope = {
  scopeType: "WEEK" | "RANGE";
  weekPeriodKey: string | null;
  startDate: string | null;
  endDate: string | null;
  scopeLabel: string;
  dailyDateKeys: string[];
  weeklyPeriodKeys: string[];
};

function daysBetweenInclusive(startDate: string, endDate: string) {
  const start = parseCheckInDateKey(startDate);
  const end = parseCheckInDateKey(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function enumerateDateKeys(startDate: string, endDate: string) {
  const keys: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }

  return keys;
}

function weekKeysOverlappingRange(startDate: string, endDate: string, timezone: string) {
  const keys: string[] = [];
  let cursor = getWeekPeriodKey(timezone, parseCheckInDateKey(startDate));
  const endWeek = getWeekPeriodKey(timezone, parseCheckInDateKey(endDate));

  while (cursor <= endWeek) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 7, timezone);
  }

  return keys;
}

export function buildWeekDailyDateKeys(weekPeriodKey: string) {
  const keys: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    keys.push(addDaysToDateKey(weekPeriodKey, offset));
  }
  return keys;
}

export function resolveShareScopeLabel(scope: Pick<ResolvedShareScope, "scopeType" | "weekPeriodKey" | "startDate" | "endDate">) {
  if (scope.scopeType === "WEEK" && scope.weekPeriodKey) {
    return `이번 주 · ${formatWeekRangeLabel(scope.weekPeriodKey)}`;
  }

  if (scope.scopeType === "RANGE" && scope.startDate && scope.endDate) {
    return `${scope.startDate} ~ ${scope.endDate}`;
  }

  return "체크인 공유";
}

export function resolveShareScope(
  input: {
    scopeType: "WEEK" | "RANGE";
    weekPeriodKey?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  },
  timezone: string,
): ResolvedShareScope {
  const today = getCheckInDate(timezone);

  if (input.scopeType === "WEEK") {
    const weekPeriodKey = input.weekPeriodKey?.trim() || getWeekPeriodKey(timezone);

    if (!isValidCheckInDateKey(weekPeriodKey)) {
      throw new Error("INVALID_WEEK_PERIOD_KEY");
    }

    if (weekPeriodKey > getWeekPeriodKey(timezone, parseCheckInDateKey(today))) {
      throw new Error("FUTURE_WEEK");
    }

    const dailyDateKeys = buildWeekDailyDateKeys(weekPeriodKey);

    return {
      scopeType: "WEEK",
      weekPeriodKey,
      startDate: dailyDateKeys[0] ?? weekPeriodKey,
      endDate: dailyDateKeys[6] ?? weekPeriodKey,
      scopeLabel: resolveShareScopeLabel({
        scopeType: "WEEK",
        weekPeriodKey,
        startDate: null,
        endDate: null,
      }),
      dailyDateKeys,
      weeklyPeriodKeys: [weekPeriodKey],
    };
  }

  const startDate = input.startDate?.trim();
  const endDate = input.endDate?.trim();

  if (!startDate || !endDate) {
    throw new Error("RANGE_DATES_REQUIRED");
  }

  if (!isValidCheckInDateKey(startDate) || !isValidCheckInDateKey(endDate)) {
    throw new Error("INVALID_DATE_KEY");
  }

  if (startDate > endDate) {
    throw new Error("INVALID_RANGE_ORDER");
  }

  if (endDate > today) {
    throw new Error("FUTURE_END_DATE");
  }

  const spanDays = daysBetweenInclusive(startDate, endDate);
  if (spanDays > CHECKIN_SHARE_MAX_RANGE_DAYS) {
    throw new Error("RANGE_TOO_LONG");
  }

  const dailyDateKeys = enumerateDateKeys(startDate, endDate);
  const weeklyPeriodKeys = weekKeysOverlappingRange(startDate, endDate, timezone);

  return {
    scopeType: "RANGE",
    weekPeriodKey: null,
    startDate,
    endDate,
    scopeLabel: resolveShareScopeLabel({
      scopeType: "RANGE",
      weekPeriodKey: null,
      startDate,
      endDate,
    }),
    dailyDateKeys,
    weeklyPeriodKeys,
  };
}

export function weekdayLabelForDateKey(dateKey: string) {
  return formatCheckInWeekdayShort(dateKey);
}
