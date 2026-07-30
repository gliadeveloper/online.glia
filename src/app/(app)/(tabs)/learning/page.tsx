import {
  AppButtonLink,
  AppEmptyState,
  AppSection,
  AppSectionHeader,
  AppStatusBanner,
  AppTabScreen,
} from "@/components/app";
import { EnrollmentCourseCard } from "@/components/learning/enrollment-course-card";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";
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

  const enrollments = await getUserEnrollments(user.id);
  const inProgress = enrollments.filter((item) => item.status === "ACTIVE");
  const completed = enrollments.filter((item) => item.status === "COMPLETED");
  const expired = enrollments.filter((item) => item.status === "EXPIRED");

  return (
    <AppTabScreen title="내 학습">
      {purchased === "1" && (
        <AppStatusBanner>구매가 완료되었습니다. 첫 레슨부터 학습을 시작해 보세요.</AppStatusBanner>
      )}

      <AppSection labelledBy="learning-continue-heading">
        <AppSectionHeader
          title="이어보기"
          titleId="learning-continue-heading"
          description="현재 수강 중인 클래스"
        />

        {inProgress.length === 0 ? (
          <AppEmptyState
            message="수강 중인 클래스가 없습니다."
            action={<AppButtonLink href="/shop">클래스 둘러보기</AppButtonLink>}
          />
        ) : (
          <ul className="app-grid app-grid--2">
            {inProgress.map((enrollment) => (
              <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </ul>
        )}
      </AppSection>

      <AppSection labelledBy="learning-completed-heading">
        <AppSectionHeader
          title="전체 목록"
          titleId="learning-completed-heading"
          description="수강 완료한 클래스"
        />

        {completed.length === 0 ? (
          <AppEmptyState message="수강 완료한 클래스가 없습니다." />
        ) : (
          <ul className="app-grid app-grid--2">
            {completed.map((enrollment) => (
              <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </ul>
        )}
      </AppSection>

      {expired.length > 0 && (
        <AppSection labelledBy="learning-expired-heading">
          <AppSectionHeader
            title="만료된 클래스"
            titleId="learning-expired-heading"
            description="수강 기간이 지난 클래스"
          />
          <ul className="app-grid app-grid--2">
            {expired.map((enrollment) => (
              <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </ul>
        </AppSection>
      )}
    </AppTabScreen>
  );
}
