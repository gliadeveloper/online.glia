import Link from "next/link";

import {
  formatCheckInDayOfMonth,
  formatCheckInShortDate,
  formatCheckInWeekdayShort,
} from "@/lib/checkin-dates";

export type CheckInDayStripItem = {
  dateKey: string;
  isToday: boolean;
  isFuture: boolean;
  isRecorded: boolean;
  href: string | null;
};

type CheckInDayStripProps = {
  days: CheckInDayStripItem[];
  title: React.ReactNode;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function columnClassName(day: CheckInDayStripItem) {
  const parts = ["check-in-strip__column"];

  if (day.isFuture) {
    parts.push("check-in-strip__column--future");
  } else if (day.isRecorded) {
    parts.push("check-in-strip__column--done");
  } else if (day.isToday) {
    parts.push("check-in-strip__column--today-open");
  } else {
    parts.push("check-in-strip__column--missed");
  }

  if (day.isToday) {
    parts.push("check-in-strip__column--today");
  }

  return parts.join(" ");
}

function cellClassName(day: CheckInDayStripItem) {
  const parts = ["check-in-strip__cell"];

  if (day.isFuture) {
    parts.push("check-in-strip__cell--future");
  } else if (day.isRecorded) {
    parts.push("check-in-strip__cell--done");
  } else if (day.isToday) {
    parts.push("check-in-strip__cell--today-open");
  } else {
    parts.push("check-in-strip__cell--missed");
  }

  return parts.join(" ");
}

function DayStripCell({ day }: { day: CheckInDayStripItem }) {
  const weekday = formatCheckInWeekdayShort(day.dateKey);
  const dayOfMonth = formatCheckInDayOfMonth(day.dateKey);
  const ariaLabel = `${formatCheckInShortDate(day.dateKey)} ${weekday}${day.isRecorded ? ", 기록 완료" : ", 미기록"}${day.isToday ? ", 오늘" : ""}${day.isFuture ? ", 예정" : ""}`;

  const circle = day.isRecorded ? (
    <CheckIcon className="check-in-strip__check" />
  ) : (
    <span className="check-in-strip__cell-date">{dayOfMonth}</span>
  );

  const column = (
    <div className={columnClassName(day)}>
      <span className="check-in-strip__weekday">{weekday}</span>

      {day.isFuture || !day.href ? (
        <div aria-label={ariaLabel} aria-disabled="true" className={cellClassName(day)}>
          {circle}
        </div>
      ) : (
        <Link
          href={day.href}
          aria-current={day.isToday ? "date" : undefined}
          aria-label={ariaLabel}
          className={`${cellClassName(day)} shell-focus-ring`}
        >
          {circle}
        </Link>
      )}
    </div>
  );

  return <div role="listitem">{column}</div>;
}

export function CheckInDayStrip({ days, title }: CheckInDayStripProps) {
  return (
    <section aria-labelledby="check-in-strip-heading" className="check-in-hub-section check-in-strip">
      <h2 id="check-in-strip-heading" className="check-in-hub-status__title check-in-strip__heading">
        {title}
      </h2>

      <div className="check-in-strip__panel">
        <div className="check-in-strip__scroll" role="list">
          {days.map((day) => (
            <DayStripCell key={day.dateKey} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}
