import Link from "next/link";

import {
  AppButtonLink,
  AppEmptyState,
  AppSection,
  AppSectionHeader,
  AppStatusBanner,
  AppTabScreen,
} from "@/components/app";
import { CoachingEntitlementSummary } from "@/components/coaching/coaching-entitlement-summary";
import { CoachingSessionCard } from "@/components/coaching/coaching-session-card";
import { EnrollmentCourseCard } from "@/components/learning/enrollment-course-card";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";
import { Typography } from "@/components/typography/typography";
import { getUserCoachingEntitlements } from "@/lib/coaching-customer";
import { getUserEnrollments } from "@/lib/learning-enrollments";
import { getCurrentUser } from "@/lib/session";

type LearningPageProps = {
  searchParams: Promise<{ purchased?: string }>;
};

export default async function LearningPage({ searchParams }: LearningPageProps) {
  const user = await getCurrentUser();
  const { purchased } = await searchParams;

  if (!user) {
    return (
      <AppTabScreen title="내 학습">
        <AppEmptyState
          message="로그인 후 수강 목록과 진도를 확인할 수 있습니다."
          action={<HeaderAuthAction isLoggedIn={false} />}
        />
      </AppTabScreen>
    );
  }

  const [enrollments, entitlements] = await Promise.all([
    getUserEnrollments(user.id),
    getUserCoachingEntitlements(user.id),
  ]);

  return (
    <AppTabScreen title="내 학습">
      {purchased === "1" && (
        <AppStatusBanner>구매가 완료되었습니다. 첫 레슨부터 학습을 시작해 보세요.</AppStatusBanner>
      )}

      {enrollments.length === 0 ? (
        <AppEmptyState
          message="아직 수강 중인 강의가 없습니다."
          action={<AppButtonLink href="/shop">상품 둘러보기</AppButtonLink>}
        />
      ) : (
        <AppSection labelledBy="enrollment-list-heading">
          <Typography as="h2" id="enrollment-list-heading" role="sectionTitle" weight="semibold" color="primary" className="sr-only">
            수강 중인 강의
          </Typography>
          <ul className="app-grid app-grid--2">
            {enrollments.map((enrollment) => (
              <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </ul>
        </AppSection>
      )}

      {entitlements.length > 0 && (
        <AppSection labelledBy="coaching-list-heading">
          <AppSectionHeader
            title="코칭"
            titleId="coaching-list-heading"
            description="회차별 코칭 콘텐츠와 Q&A"
            action={
              <Link href="/coaching" className="app-btn app-btn--secondary shell-focus-ring">
                <Typography as="span" role="bodySecondary" weight="medium" color="primary">
                  전체 보기
                </Typography>
              </Link>
            }
          />

          {entitlements.slice(0, 1).map((entitlement) => (
            <div key={entitlement.id} className="app-section">
              <CoachingEntitlementSummary entitlement={entitlement} />
              <ul className="app-section">
                {entitlement.sessions.slice(0, 3).map((session) => (
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
            </div>
          ))}
        </AppSection>
      )}
    </AppTabScreen>
  );
}
