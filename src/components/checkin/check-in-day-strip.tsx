import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

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
  title: ReactNode;
  framed?: boolean;
};

function cellClassName(day: CheckInDayStripItem) {
  const parts = ["glia-ci-strip__cell"];

  if (day.isToday && day.isRecorded) {
    parts.push("glia-ci-strip__cell--today-done");
  } else if (day.isToday) {
    parts.push("glia-ci-strip__cell--today");
  } else if (day.isFuture) {
    parts.push("glia-ci-strip__cell--future");
  } else if (day.isRecorded) {
    parts.push("glia-ci-strip__cell--done");
  } else {
    parts.push("glia-ci-strip__cell--missed");
  }

  return parts.join(" ");
}

function DayStripCell({ day }: { day: CheckInDayStripItem }) {
  const weekday = formatCheckInWeekdayShort(day.dateKey);
  const dayOfMonth = formatCheckInDayOfMonth(day.dateKey);
  const ariaLabel = `${formatCheckInShortDate(day.dateKey)} ${weekday}${day.isRecorded ? ", 기록 완료" : ", 미기록"}${day.isToday ? ", 오늘" : ""}${day.isFuture ? ", 예정" : ""}`;

  const inner = day.isRecorded ? (
    <Check strokeWidth={2} size={16} aria-hidden="true" />
  ) : (
    <span>{dayOfMonth}</span>
  );

  return (
    <div
      role="listitem"
      className={`glia-ci-strip__col${day.isToday ? " glia-ci-strip__col--today" : ""}`}
    >
      <span className="glia-ci-strip__weekday">{weekday}</span>
      {day.isFuture || !day.href ? (
        <div aria-label={ariaLabel} aria-disabled="true" className={cellClassName(day)}>
          {inner}
        </div>
      ) : (
        <Link
          href={day.href}
          aria-current={day.isToday ? "date" : undefined}
          aria-label={ariaLabel}
          className={cellClassName(day)}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}

export function CheckInDayStrip({ days, title, framed = false }: CheckInDayStripProps) {
  return (
    <section
      className={framed ? "glia-ci-strip-card" : "glia-ci__section"}
      aria-labelledby="check-in-strip-heading"
    >
      <h2
        id="check-in-strip-heading"
        className={framed ? "glia-ci-strip-card__label" : "glia-ci__section-title"}
      >
        {title}
      </h2>
      <div className="glia-ci-strip" role="list">
        {days.map((day) => (
          <DayStripCell key={day.dateKey} day={day} />
        ))}
      </div>
    </section>
  );
}
