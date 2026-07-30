import { Typography } from "@/components/typography/typography";
import { coachingEntitlementLabels } from "@/lib/customer-labels";
import type { UserCoachingEntitlement } from "@/lib/coaching-customer";

type CoachingEntitlementSummaryProps = {
  entitlement: UserCoachingEntitlement;
};

export function CoachingEntitlementSummary({ entitlement }: CoachingEntitlementSummaryProps) {
  return (
    <article className="app-panel app-panel--padded">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography as="p" role="caption" weight="medium" color="action">
            코칭
          </Typography>
          <Typography as="h2" role="sectionTitle" weight="semibold" color="primary" className="app-section-header__desc">
            {entitlement.coachingOffering.title}
          </Typography>
          {entitlement.course && (
            <Typography as="p" role="bodySecondary" color="secondary">
              연결 강의: {entitlement.course.title}
            </Typography>
          )}
        </div>
        <span className="app-chip shrink-0">{coachingEntitlementLabels[entitlement.status]}</span>
      </div>

      <div className="app-section-header__desc grid grid-cols-3 gap-3 text-center">
        {[
          {
            label: "완료",
            value: `${entitlement.completedSessions}/${entitlement.totalSessions}회`,
          },
          { label: "총 회차", value: `${entitlement.totalSessions}회` },
          {
            label: "만료",
            value: entitlement.validUntil.toLocaleDateString("ko-KR"),
          },
        ].map((item) => (
          <div key={item.label} className="app-panel app-panel--padded !p-3 !shadow-none">
            <Typography as="p" role="caption" color="secondary">
              {item.label}
            </Typography>
            <Typography as="p" role="bodySecondary" weight="semibold" color="primary" className="app-section-header__desc">
              {item.value}
            </Typography>
          </div>
        ))}
      </div>
    </article>
  );
}
