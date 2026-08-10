import { addDaysToDateKey } from "@/lib/checkin-dates";
import { getWeekPeriodKey } from "@/lib/forms";

const CALENDAR_WEEK_DAYS = 7;

/** Mon–Sun calendar week — how many days have a daily check-in this week. */
export function getCalendarWeekRecord(params: {
  today: string;
  timezone: string;
  recordedDates: Iterable<string>;
}) {
  const recorded = new Set(params.recordedDates);
  const weekStart = getWeekPeriodKey(params.timezone, new Date(`${params.today}T12:00:00`));

  let recordedDays = 0;
  for (let offset = 0; offset < CALENDAR_WEEK_DAYS; offset += 1) {
    const dateKey = addDaysToDateKey(weekStart, offset, params.timezone);
    if (recorded.has(dateKey)) {
      recordedDays += 1;
    }
  }

  return {
    recordedDays,
    weekDays: CALENDAR_WEEK_DAYS,
    progress: Math.round((recordedDays / CALENDAR_WEEK_DAYS) * 100),
  };
}

/** Visible day strip — recorded count in the centered 7-day window (UI hint only). */
export function getDayStripRecordedCount(
  days: Array<{ isRecorded: boolean; isFuture: boolean }>,
) {
  return days.filter((day) => !day.isFuture && day.isRecorded).length;
}
