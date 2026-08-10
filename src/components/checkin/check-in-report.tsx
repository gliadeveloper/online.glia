import Link from "next/link";

import { CheckInReportSavedNotice } from "@/components/checkin/check-in-report-saved-notice";
import { TrustButtonLink } from "@/components/corporate-trust/app-trust-ui";
import type { CheckInReportItem } from "@/lib/checkin-report";
import type { CheckInSchedule } from "@/lib/checkin-routes";
import { checkInFormPath } from "@/lib/checkin-routes";

type CheckInReportProps = {
  schedule: CheckInSchedule;
  periodKey: string;
  periodLabel: string;
  items: CheckInReportItem[];
  hubHref: string;
  showSavedNotice?: boolean;
};

const SCHEDULE_KIND_LABEL: Record<CheckInSchedule, string> = {
  daily: "데일리 체크",
  weekly: "주간 체크",
};

export function CheckInReport({
  schedule,
  periodKey,
  periodLabel,
  items,
  hubHref,
  showSavedNotice = false,
}: CheckInReportProps) {
  const kindLabel = SCHEDULE_KIND_LABEL[schedule];

  return (
    <div className="check-in-report-page">
      <div className="check-in-report-page__body">
        <CheckInReportSavedNotice showInitially={showSavedNotice} />

        <p className="check-in-report__context">
          {periodLabel} · {kindLabel}
        </p>

        <section aria-labelledby="check-in-report-summary-heading" className="check-in-report__summary">
          <h2 id="check-in-report-summary-heading" className="check-in-report__section-label">
            기록 요약
          </h2>

          <dl className="check-in-report__list">
            {items.map((item) => (
              <div key={item.questionId} className="check-in-report__item">
                <dt>{item.prompt}</dt>
                <dd className="check-in-report__value">
                  {item.emoji ? (
                    <span role="img" aria-label={item.displayValue}>
                      {item.emoji}
                    </span>
                  ) : (
                    <span>{item.displayValue}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="check-in-report-insight-heading" className="check-in-report__insight">
          <h2 id="check-in-report-insight-heading" className="check-in-report__section-label">
            리포트
          </h2>
          <p className="check-in-report__placeholder">
            맞춤 리포트를 준비 중입니다. 곧 이곳에서 더 자세한 인사이트를 확인할 수 있습니다.
          </p>
        </section>
      </div>

      <div className="check-in-report__footer">
        <Link
          href={checkInFormPath(schedule, periodKey, { redo: true })}
          className="corp-trust-btn-ghost corp-trust-focus shell-focus-ring trust-btn check-in-report__footer-btn check-in-report__footer-btn--ghost"
        >
          다시하기
        </Link>
        <TrustButtonLink
          href={hubHref}
          className="check-in-report__footer-btn check-in-report__footer-btn--primary"
        >
          체크인 목록
        </TrustButtonLink>
      </div>
    </div>
  );
}
