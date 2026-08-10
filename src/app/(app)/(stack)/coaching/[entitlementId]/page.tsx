import { notFound, redirect } from "next/navigation";

import { AppSection, AppSectionHeader, AppStackPage } from "@/components/app";
import { CoachingCoachProfile } from "@/components/coaching/coaching-coach-profile";
import { CoachingSessionCard } from "@/components/coaching/coaching-session-card";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { Typography } from "@/components/typography/typography";
import {
  formatCoachingExpiry,
  formatCoachingProgress,
  resolveEntitlementCoach,
} from "@/lib/coaching-display";
import { getCoachingEntitlementForUser } from "@/lib/coaching-customer";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type CoachingEntitlementPageProps = {
  params: Promise<{ entitlementId: string }>;
};

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

  return (
    <AppStackPage>
      <StackNavTitle title={entitlement.coachingOffering.title} />

      <TabPageHeader
        eyebrow="Coaching"
        title="코칭"
        titleAccent="회차"
        description={`${entitlement.coachingOffering.title} · ${formatCoachingProgress(entitlement.completedSessions, entitlement.totalSessions)}`}
        variant="stack"
      />

      <header className="app-section">
        {coach && <CoachingCoachProfile coach={coach} />}

        <dl className="app-section-header__desc flex flex-wrap gap-x-4 gap-y-1">
          <div>
            <Typography as="dt" role="caption" color="secondary" className="inline">
              만료{" "}
            </Typography>
            <Typography as="dd" role="bodySecondary" color="primary" className="inline">
              {formatCoachingExpiry(entitlement.validUntil)}
            </Typography>
          </div>
          <div>
            <Typography as="dt" role="caption" color="secondary" className="inline">
              진행{" "}
            </Typography>
            <Typography as="dd" role="bodySecondary" color="primary" className="inline">
              {formatCoachingProgress(entitlement.completedSessions, entitlement.totalSessions)}
            </Typography>
          </div>
        </dl>
      </header>

      <AppSection labelledBy="coaching-session-list-heading">
        <AppSectionHeader title="회차 목록" titleId="coaching-session-list-heading" />
        <ul className="app-section">
          {entitlement.sessions.map((session) => (
            <CoachingSessionCard
              key={session.id}
              sessionId={session.id}
              sessionNo={session.sessionNo}
              title={session.title}
              coachName={session.coach.name ?? session.coach.email}
              scheduledAt={session.scheduledAt.toISOString()}
              publicationStatus={session.publicationStatus}
              pendingReplyCount={session.conversation?.messages.length ?? 0}
            />
          ))}
        </ul>
      </AppSection>
    </AppStackPage>
  );
}
