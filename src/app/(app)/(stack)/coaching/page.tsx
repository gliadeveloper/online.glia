import { redirect } from "next/navigation";

import { AppButtonLink, AppEmptyState, AppSection, AppStackPage } from "@/components/app";
import { CoachingEntitlementSummary } from "@/components/coaching/coaching-entitlement-summary";
import { CoachingSessionCard } from "@/components/coaching/coaching-session-card";
import { getUserCoachingEntitlements } from "@/lib/coaching-customer";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

export default async function CoachingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/coaching");
  }

  const entitlements = await getUserCoachingEntitlements(user.id);

  return (
    <AppStackPage>
      <StackNavTitle title="코칭" />

      {entitlements.length === 0 ? (
        <AppEmptyState
          message="보유 중인 코칭권이 없습니다."
          action={<AppButtonLink href="/shop">코칭 상품 보기</AppButtonLink>}
        />
      ) : (
        entitlements.map((entitlement) => (
          <AppSection key={entitlement.id} labelledBy={`coaching-${entitlement.id}`}>
            <CoachingEntitlementSummary entitlement={entitlement} />
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
        ))
      )}
    </AppStackPage>
  );
}
