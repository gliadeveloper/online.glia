import Link from "next/link";
import {
  Activity,
  Brain,
  Check,
  Droplets,
  HeartPulse,
  Moon,
  Sparkles,
} from "lucide-react";

import { CheckInReportSavedNotice } from "@/components/checkin/check-in-report-saved-notice";
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

const ITEM_ICONS = [HeartPulse, Brain, Droplets, Moon, Activity];
const ITEM_ICON_TONES = ["", "glia-ci-icon--recovery", "glia-ci-icon--info"] as const;

export function CheckInReport({
  schedule,
  periodKey,
  periodLabel,
  items,
  hubHref,
  showSavedNotice = false,
}: CheckInReportProps) {
  const kindLabel = SCHEDULE_KIND_LABEL[schedule];
  const lede =
    schedule === "weekly"
      ? "이번 주 회복과 균형의 흐름을 정리했어요."
      : "몸과 마음의 균형을 기록해 두었어요.";

  return (
    <div className="check-in-report-page glia-ci-report">
      <div className="check-in-report-page__body">
        <header className="glia-ci-report__hero">
          <div className="glia-ci-report__ambient" aria-hidden="true">
            <span className="glia-ci-report__blob glia-ci-report__blob--mint" />
            <span className="glia-ci-report__blob glia-ci-report__blob--blue" />
            <span className="glia-ci-report__blob glia-ci-report__blob--wash" />
          </div>

          <p className="glia-ci-hero__eyebrow">{kindLabel}</p>
          <div className="glia-ci-report__hero-row">
            <h1 className="glia-ci-report__title">
              {periodLabel} <em>기록</em>
            </h1>
            <span className="glia-ci-pill glia-ci-pill--done">
              <Check strokeWidth={2} size={14} aria-hidden="true" />
              작성 완료
            </span>
          </div>
          <p className="glia-ci-report__lede">{lede}</p>
        </header>

        <CheckInReportSavedNotice showInitially={showSavedNotice} />

        <section className="glia-ci-report__section" aria-labelledby="check-in-report-summary-heading">
          <h2 id="check-in-report-summary-heading" className="glia-ci__section-title">
            기록 요약
          </h2>
          <dl className="glia-ci-report__list">
            {items.map((item, index) => {
              const Icon = ITEM_ICONS[index % ITEM_ICONS.length];
              const tone = ITEM_ICON_TONES[index % ITEM_ICON_TONES.length];

              return (
                <div key={item.questionId} className="glia-ci-report__item">
                  <span className={`glia-ci-icon${tone ? ` ${tone}` : ""}`} aria-hidden="true">
                    <Icon strokeWidth={2} size={20} />
                  </span>
                  <div className="glia-ci-report__item-body">
                    <dt>{item.prompt}</dt>
                    <dd>
                      {item.emoji ? (
                        <span role="img" aria-label={item.displayValue}>
                          {item.emoji} {item.displayValue}
                        </span>
                      ) : (
                        item.displayValue
                      )}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </section>

        <section className="glia-ci-report__insight" aria-labelledby="check-in-report-insight-heading">
          <span className="glia-ci-icon glia-ci-icon--recovery" aria-hidden="true">
            <Sparkles strokeWidth={2} size={20} />
          </span>
          <div>
            <h2 id="check-in-report-insight-heading" className="glia-ci__section-title">
              리포트
            </h2>
            <p>맞춤 리포트를 준비 중입니다. 곧 이곳에서 더 자세한 인사이트를 확인할 수 있습니다.</p>
          </div>
        </section>
      </div>

      <div className="check-in-report__footer">
        <Link
          href={checkInFormPath(schedule, periodKey, { redo: true })}
          className="check-in-report__footer-btn glia-ci-btn glia-ci-btn--secondary"
        >
          다시하기
        </Link>
        <Link
          href={hubHref}
          className="check-in-report__footer-btn glia-ci-btn glia-ci-btn--primary"
        >
          체크인 목록
        </Link>
      </div>
    </div>
  );
}
