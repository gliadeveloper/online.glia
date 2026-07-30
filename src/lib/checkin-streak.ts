import { addDaysToDateKey } from "@/lib/checkin-dates";
import { getWeekPeriodKey } from "@/lib/forms";

export type CheckInStreakHeadline =
  | { kind: "prompt" }
  | { kind: "start"; streak: 1 }
  | { kind: "continuing"; streak: number };

/**
 * Daily streak within the current calendar week (Mon–Sun).
 * Only meaningful when `today` has a submission — caller gates headline copy.
 */
export function calculateDailyStreak(params: {
  today: string;
  timezone: string;
  recordedDates: Set<string>;
}): number {
  const { today, timezone, recordedDates } = params;
  const weekStart = getWeekPeriodKey(timezone, new Date(`${today}T12:00:00`));

  if (!recordedDates.has(today)) {
    return 0;
  }

  let streak = 0;
  let cursor = today;

  while (cursor >= weekStart) {
    if (!recordedDates.has(cursor)) {
      break;
    }
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1, timezone);
  }

  return streak;
}

export function resolveStreakHeadline(params: {
  todayDailyDone: boolean;
  streak: number;
}): CheckInStreakHeadline {
  if (!params.todayDailyDone || params.streak === 0) {
    return { kind: "prompt" };
  }

  if (params.streak === 1) {
    return { kind: "start", streak: 1 };
  }

  return { kind: "continuing", streak: params.streak };
}

export function streakHeadlineText(headline: CheckInStreakHeadline): string {
  switch (headline.kind) {
    case "prompt":
      return "데일리 체크를 남겨보세요!";
    case "start":
      return "체크 1일차 시작!";
    case "continuing":
      return `연속체크 ${headline.streak}일차`;
  }
}
