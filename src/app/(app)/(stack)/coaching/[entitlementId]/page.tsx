import { CalendarClock } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { CoachingSessionCard } from "@/components/coaching/coaching-session-card";
import {
  displayCoachName,
  formatCoachingExpiry,
  formatCoachingProgress,
  resolveEntitlementCoach,
} from "@/lib/coaching-display";
import { getCoachingEntitlementForUser } from "@/lib/coaching-customer";
import { coachingEntitlementLabels } from "@/lib/customer-labels";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/coaching/coaching-stack-glia.css";

type CoachingEntitlementPageProps = {
  params: Promise<{ entitlementId: string }>;
};

function statusVariant(status: keyof typeof coachingEntitlementLabels) {
  if (status === "COMPLETED") return "completed";
  if (status === "EXPIRED") return "expired";
  if (status === "REVOKED") return "revoked";
  if (status === "SUSPENDED") return "suspended";
  return "active";
}

export default async function CoachingEntitlementPage({ params }: CoachingEntitlementPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/coaching");
  }

  const { entitlementId } = await params;
  const entitlement = await getCoachingEntitlementForUser(user.id, entitlementId);

  if (!entitlement) {
    notFound();
  }

  const coach = resolveEntitlementCoach(entitlement);
  const coachName = coach ? displayCoachName(coach) : null;
  const coachInitial = coachName?.slice(0, 1).toUpperCase() ?? "";
  const progressPercent =
    entitlement.totalSessions === 0
      ? 0
      : Math.round((entitlement.completedSessions / entitlement.totalSessions) * 100);
  const sessionCount = entitlement.sessions.length;
  const variant = statusVariant(entitlement.status);

  return (
    <div className="glia-sessions">
      <StackNavTitle title={entitlement.coachingOffering.title} />

      <header className="glia-sessions__hero">
        <div className="glia-sessions__ambient" aria-hidden="true">
          <span className="glia-sessions__blob glia-sessions__blob--mint" />
          <span className="glia-sessions__blob glia-sessions__blob--blue" />
          <span className="glia-sessions__blob glia-sessions__blob--wash" />
        </div>

        <div className="glia-sessions__hero-copy">
          <p className="glia-sessions__eyebrow">
            <span className="glia-sessions__eyebrow-dot" aria-hidden="true" />
            Coaching
          </p>

          <div className="glia-sessions__heading">
            <h1 className="glia-sessions__title">{entitlement.coachingOffering.title}</h1>
            <span className={`glia-sessions__status glia-sessions__status--${variant}`}>
              {coachingEntitlementLabels[entitlement.status]}
            </span>
          </div>

          {coach && coachName ? (
            <div className="glia-sessions__coach">
              <span className="glia-sessions__avatar" aria-hidden="true">
                {coach.profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.profile.avatarUrl} alt="" />
                ) : (
                  coachInitial
                )}
              </span>
              <div className="glia-sessions__coach-copy">
                <p className="glia-sessions__coach-name">{coachName}</p>
                <p className="glia-sessions__coach-role">담당 코치</p>
              </div>
            </div>
          ) : null}

          <div className="glia-sessions__meta">
            <span className="glia-sessions__chip">
              <CalendarClock size={12} aria-hidden="true" />
              {formatCoachingExpiry(entitlement.validUntil)}까지
            </span>
          </div>

          <div className="glia-sessions__progress">
            <div className="glia-sessions__progress-head">
              <span className="glia-sessions__progress-label">진행</span>
              <span className="glia-sessions__progress-value">
                {formatCoachingProgress(entitlement.completedSessions, entitlement.totalSessions)} ·{" "}
                {progressPercent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${entitlement.coachingOffering.title} 회차 진행 ${progressPercent}%`}
              className="glia-sessions__progress-track"
            >
              <div className="glia-sessions__progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="glia-sessions__body">
        <section className="glia-sessions__section" aria-labelledby="coaching-session-list-heading">
          <header className="glia-sessions__section-head">
            <div>
              <h2 id="coaching-session-list-heading" className="glia-sessions__section-title">
                회차 목록
              </h2>
              <p className="glia-sessions__section-caption">오픈된 회차부터 이어서 진행하세요</p>
            </div>
            {sessionCount > 0 && (
              <p className="glia-sessions__section-count">{sessionCount}개</p>
            )}
          </header>

          {sessionCount === 0 ? (
            <div className="glia-sessions__empty">
              <p className="glia-sessions__empty-title">아직 열린 회차가 없습니다</p>
              <p className="glia-sessions__empty-hint">코치가 회차를 등록하면 여기에서 확인할 수 있습니다.</p>
            </div>
          ) : (
            <ul className="glia-sessions__list">
              {entitlement.sessions.map((session) => (
                <CoachingSessionCard
                  key={session.id}
                  sessionId={session.id}
                  sessionNo={session.sessionNo}
                  title={session.title}
                  scheduledAt={session.scheduledAt.toISOString()}
                  publicationStatus={session.publicationStatus}
                  pendingReplyCount={session.conversation?.messages.length ?? 0}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
