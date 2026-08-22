import Link from "next/link";
import { CalendarClock } from "lucide-react";

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

function statusVariant(status: CoachingEntitlementCardProps["status"]) {
  if (status === "COMPLETED") return "completed";
  if (status === "EXPIRED") return "expired";
  if (status === "REVOKED") return "revoked";
  if (status === "SUSPENDED") return "suspended";
  return "active";
}

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
  const initial = coachName.slice(0, 1).toUpperCase();
  const progressPercent =
    totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100);
  const variant = statusVariant(status);

  return (
    <li className="glia-entitlement">
      <Link
        href={`/coaching/${entitlementId}`}
        className="glia-entitlement__frame glia-entitlement__frame--interactive"
      >
        <div className="glia-entitlement__top">
          <span className="glia-entitlement__avatar" aria-hidden="true">
            {coach?.profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coach.profile.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>

          <div className="glia-entitlement__copy">
            <div className="glia-entitlement__heading">
              <h3 className="glia-entitlement__title">{productTitle}</h3>
              <span className={`glia-entitlement__status glia-entitlement__status--${variant}`}>
                {coachingEntitlementLabels[status]}
              </span>
            </div>
            <p className="glia-entitlement__coach">{coachName}</p>
          </div>
        </div>

        <div className="glia-entitlement__meta">
          <span className="glia-entitlement__chip">
            <CalendarClock size={12} aria-hidden="true" />
            {formatCoachingExpiry(validUntil)}까지
          </span>
        </div>

        <div className="glia-entitlement__progress">
          <div className="glia-entitlement__progress-head">
            <span className="glia-entitlement__progress-label">진행</span>
            <span className="glia-entitlement__progress-value">
              {formatCoachingProgress(completedSessions, totalSessions)} · {progressPercent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${productTitle} 회차 진행 ${progressPercent}%`}
            className="glia-entitlement__progress-track"
          >
            <div
              className="glia-entitlement__progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <span className="sr-only">{productTitle} 코칭 회차 목록으로 이동</span>
      </Link>
    </li>
  );
}

export function coachingEntitlementCardProps(entitlement: {
  id: string;
  status: keyof typeof coachingEntitlementLabels;
  validUntil: Date;
  completedSessions: number;
  totalSessions: number;
  coachingOffering: { title: string; coach: CoachProfile | null };
  sessions: { coach: CoachProfile }[];
}) {
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
