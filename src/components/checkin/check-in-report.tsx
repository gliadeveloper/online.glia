import Link from "next/link";

import { Typography } from "@/components/typography/typography";
import type { CheckInReportItem } from "@/lib/checkin-report";
import type { CheckInSchedule } from "@/lib/checkin-routes";
import { checkInFormPath } from "@/lib/checkin-routes";

type CheckInReportProps = {
  schedule: CheckInSchedule;
  periodKey: string;
  periodLabel: string;
  items: CheckInReportItem[];
  hubHref: string;
};

export function CheckInReport({
  schedule,
  periodKey,
  periodLabel,
  items,
  hubHref,
}: CheckInReportProps) {
  return (
    <div className="check-in-report-page">
      <div className="check-in-report-page__body">
        <div className="check-in-report__hero">
          <div className="check-in-report__icon" aria-hidden="true">
            <svg
              width={32}
              height={32}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>

          <Typography as="h1" role="pageTitle" weight="semibold" color="primary" className="check-in-report__title">
            기록 완료
          </Typography>
          <Typography as="p" role="bodySecondary" color="secondary" className="check-in-report__period">
            {periodLabel}
          </Typography>
        </div>

        <section aria-labelledby="check-in-report-summary-heading" className="check-in-report__summary">
          <Typography
            as="h2"
            id="check-in-report-summary-heading"
            role="label"
            weight="semibold"
            color="secondary"
            className="check-in-report__section-label"
          >
            기록 요약
          </Typography>

          <dl className="check-in-report__list">
            {items.map((item) => (
              <div key={item.questionId} className="check-in-report__item">
                <Typography as="dt" role="caption" color="secondary">
                  {item.prompt}
                </Typography>
                <dd className="check-in-report__value">
                  {item.emoji ? (
                    <Typography as="span" role="bodyCompact" aria-label={item.displayValue}>
                      {item.emoji}
                    </Typography>
                  ) : (
                    <Typography as="span" role="bodyCompact" weight="semibold" color="primary">
                      {item.displayValue}
                    </Typography>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="check-in-report-insight-heading" className="check-in-report__insight">
          <Typography
            as="h2"
            id="check-in-report-insight-heading"
            role="label"
            weight="semibold"
            color="secondary"
            className="check-in-report__section-label"
          >
            리포트
          </Typography>
          <Typography as="p" role="bodySecondary" color="secondary" className="check-in-report__placeholder">
            맞춤 리포트를 준비 중입니다. 곧 이곳에서 더 자세한 인사이트를 확인할 수 있습니다.
          </Typography>
        </section>
      </div>

      <div className="check-in-report__footer">
        <Link
          href={checkInFormPath(schedule, periodKey, { redo: true })}
          className="check-in-report__footer-btn check-in-report__footer-btn--ghost shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="medium">
            다시하기
          </Typography>
        </Link>
        <Link
          href={hubHref}
          className="check-in-report__footer-btn check-in-report__footer-btn--primary shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="semibold">
            체크인 목록
          </Typography>
        </Link>
      </div>
    </div>
  );
}
