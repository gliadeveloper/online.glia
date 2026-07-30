import Link from "next/link";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Typography } from "@/components/typography/typography";
import {
  displayCoachName,
  formatCoachingExpiry,
  formatCoachingProgress,
  resolveEntitlementCoach,
  type CoachProfile,
} from "@/lib/coaching-display";
import { coachingEntitlementLabels } from "@/lib/customer-labels";

type CoachingEntitlementCardProps = {
  entitlementId: string;
  productTitle: string;
  status: keyof typeof coachingEntitlementLabels;
  validUntil: Date;
  completedSessions: number;
  totalSessions: number;
  coach: CoachProfile | null;
};

export function CoachingEntitlementCard({
  entitlementId,
  productTitle,
  status,
  validUntil,
  completedSessions,
  totalSessions,
  coach,
}: CoachingEntitlementCardProps) {
  const coachName = coach ? displayCoachName(coach) : "담당 코치";

  return (
    <li>
      <Link
        href={`/coaching/${entitlementId}`}
        className="app-card app-card--interactive shell-focus-ring"
      >
        <div className="app-card__body">
          <div className="flex items-start gap-3">
            {coach && (
              <UserAvatar
                name={coach.name}
                email={coach.email}
                avatarUrl={coach.profile?.avatarUrl}
                size="md"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <Typography as="h2" role="sectionTitle" weight="semibold" color="primary" className="min-w-0">
                  {productTitle}
                </Typography>
                <span className="app-chip shrink-0">{coachingEntitlementLabels[status]}</span>
              </div>

              <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
                {coachName}
              </Typography>

              <dl className="app-section-header__desc flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  <Typography as="dt" role="caption" color="secondary" className="inline">
                    만료{" "}
                  </Typography>
                  <Typography as="dd" role="bodySecondary" color="primary" className="inline">
                    {formatCoachingExpiry(validUntil)}
                  </Typography>
                </div>
                <div>
                  <Typography as="dt" role="caption" color="secondary" className="inline">
                    진행{" "}
                  </Typography>
                  <Typography as="dd" role="bodySecondary" color="primary" className="inline">
                    {formatCoachingProgress(completedSessions, totalSessions)}
                  </Typography>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <span className="sr-only">{productTitle} 코칭 회차 목록으로 이동</span>
      </Link>
    </li>
  );
}

export function coachingEntitlementCardProps(
  entitlement: {
    id: string;
    status: keyof typeof coachingEntitlementLabels;
    validUntil: Date;
    completedSessions: number;
    totalSessions: number;
    coachingOffering: { title: string; coach: CoachProfile | null };
    sessions: { coach: CoachProfile }[];
  },
) {
  return {
    entitlementId: entitlement.id,
    productTitle: entitlement.coachingOffering.title,
    status: entitlement.status,
    validUntil: entitlement.validUntil,
    completedSessions: entitlement.completedSessions,
    totalSessions: entitlement.totalSessions,
    coach: resolveEntitlementCoach(entitlement),
  };
}
