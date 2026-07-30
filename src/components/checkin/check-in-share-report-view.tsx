import type { CheckInShareReportContent } from "@/lib/checkin-share/types";
import { Typography } from "@/components/typography/typography";

type CheckInShareReportViewProps = {
  content: CheckInShareReportContent;
  /** Preview mode shows consent footnote */
  mode?: "preview" | "readonly";
};

export function CheckInShareReportView({ content, mode = "readonly" }: CheckInShareReportViewProps) {
  return (
    <article className="check-in-share-report">
      <header className="check-in-share-report__header">
        <Typography as="h2" role="sectionTitle" weight="semibold" color="primary">
          {content.scopeLabel}
        </Typography>
        <Typography as="p" role="caption" color="secondary" className="check-in-share-report__summary">
          데일리 {content.summary.dailyRecorded}/{content.summary.dailyInScope} · 주간{" "}
          {content.summary.weeklyRecorded}/{content.summary.weeklyInScope}
        </Typography>
      </header>

      <section aria-labelledby="check-in-share-daily-heading" className="check-in-share-report__section">
        <Typography
          as="h3"
          id="check-in-share-daily-heading"
          role="label"
          weight="semibold"
          color="secondary"
          className="check-in-share-report__section-label"
        >
          데일리
        </Typography>

        <div className="check-in-share-report__daily-list">
          {content.dailySections.map((section) => (
            <div key={section.dateKey} className="check-in-share-report__day">
              <div className="check-in-share-report__day-head">
                <Typography as="span" role="bodyCompact" weight="semibold" color="primary">
                  {section.dateKey}
                </Typography>
                <Typography as="span" role="caption" color="secondary">
                  {section.weekdayLabel}
                </Typography>
              </div>

              {section.recorded ? (
                <dl className="check-in-share-report__items">
                  {section.items.map((item) => (
                    <div key={item.questionId} className="check-in-share-report__item">
                      <Typography as="dt" role="caption" color="secondary">
                        {item.prompt}
                      </Typography>
                      <dd className="check-in-share-report__value">
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
              ) : (
                <Typography as="p" role="caption" color="disabled">
                  기록 없음
                </Typography>
              )}
            </div>
          ))}
        </div>
      </section>

      {content.weeklySections.length > 0 && (
        <section aria-labelledby="check-in-share-weekly-heading" className="check-in-share-report__section">
          <Typography
            as="h3"
            id="check-in-share-weekly-heading"
            role="label"
            weight="semibold"
            color="secondary"
            className="check-in-share-report__section-label"
          >
            주간
          </Typography>

          {content.weeklySections.map((section) => (
            <div key={section.weekPeriodKey} className="check-in-share-report__week">
              <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
                {section.periodLabel}
              </Typography>

              {section.recorded ? (
                <dl className="check-in-share-report__items">
                  {section.items.map((item) => (
                    <div key={item.questionId} className="check-in-share-report__item">
                      <Typography as="dt" role="caption" color="secondary">
                        {item.prompt}
                      </Typography>
                      <dd className="check-in-share-report__value">
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
              ) : (
                <Typography as="p" role="caption" color="disabled">
                  주간 체크 없음
                </Typography>
              )}
            </div>
          ))}
        </section>
      )}

      {mode === "preview" && (
        <footer className="check-in-share-report__footnote">
          <Typography as="p" role="caption" color="secondary">
            수락 시 위 내용이 리포트로 저장됩니다. 수락 후에는 공유를 취소할 수 없습니다.
          </Typography>
        </footer>
      )}
    </article>
  );
}
