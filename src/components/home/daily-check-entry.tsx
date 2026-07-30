import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";
import { Typography } from "@/components/typography/typography";
import { checkInReportPath } from "@/lib/checkin-routes";

type DailyCheckEntryProps = {
  isLoggedIn: boolean;
  todayLabel: string;
  checkInDateKey?: string;
  completed?: boolean;
};

export function DailyCheckEntry({
  isLoggedIn,
  todayLabel,
  checkInDateKey,
  completed,
}: DailyCheckEntryProps) {
  const statusLabel = !isLoggedIn
    ? "로그인 후 기록하기"
    : completed
      ? "오늘 리포트 보기"
      : "오늘 기록하기";

  const href =
    !checkInDateKey
      ? "/checkin"
      : completed
        ? checkInReportPath("daily", checkInDateKey)
        : `/checkin/daily/${checkInDateKey}`;

  const statusTone = !isLoggedIn ? "neutral" : completed ? "complete" : "pending";

  return (
    <section aria-labelledby="daily-check-entry-heading">
      <Link href={href} className="check-in-entry-card shell-focus-ring">
        <div className="check-in-entry-card__content">
          <Typography as="p" role="caption" weight="semibold" color="secondary">
            {todayLabel}
          </Typography>
          <Typography
            as="h2"
            id="daily-check-entry-heading"
            role="sectionTitle"
            weight="semibold"
            color="primary"
            className="check-in-entry-card__title"
          >
            데일리 체크
          </Typography>
          <Typography as="p" role="bodySecondary" color="secondary" className="check-in-entry-card__description">
            {isLoggedIn
              ? completed
                ? "오늘 기록을 확인하거나 다시할 수 있습니다."
                : "오늘 하루를 짧게 돌아보고 기록해 보세요."
              : "로그인하고 오늘의 기록을 시작해 보세요."}
          </Typography>
          <div className="check-in-entry-card__status">
            <StatusPill tone={statusTone} showCompleteIcon={statusTone === "complete"}>
              {statusLabel}
            </StatusPill>
          </div>
        </div>

        <span className="check-in-entry-card__chevron" aria-hidden="true">
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>

        <span className="sr-only">데일리 체크로 이동</span>
      </Link>
    </section>
  );
}
