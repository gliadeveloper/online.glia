import { notFound, redirect } from "next/navigation";

import { AppSection, AppSectionHeader, AppStackPage } from "@/components/app";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { CourseDetailHeader } from "@/components/learning/course-detail-header";
import { CourseModuleList } from "@/components/learning/course-module-list";
import { EnrollmentExpiredNotice } from "@/components/learning/enrollment-expired-notice";
import { getEnrolledCourseDetail } from "@/lib/learning-course-detail";
import { getCourseShopStateBySlug } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type LearningCoursePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LearningCoursePage({ params }: LearningCoursePageProps) {
  const user = await getCurrentUser();
  const { slug } = await params;

  if (!user) {
    redirect(`/login?next=/learning/${slug}`);
  }

  const detail = await getEnrolledCourseDetail(user.id, slug);
  if (!detail) {
    notFound();
  }

  if (detail.accessState === "expired") {
    const courseShopState = await getCourseShopStateBySlug(user.id, slug);

    return (
      <AppStackPage>
        <StackNavTitle title={detail.course.title} />
        <EnrollmentExpiredNotice
          courseTitle={detail.course.title}
          enrollment={detail.enrollment}
          extendHref={
            courseShopState?.kind === "expired" ? courseShopState.extendHref : "/shop"
          }
          restoreHref={
            courseShopState?.kind === "expired" ? courseShopState.restoreHref : undefined
          }
        />
      </AppStackPage>
    );
  }

  if (detail.accessState === "blocked") {
    notFound();
  }

  const { course, enrollment, progressMap, completedCount, totalLessons, progressPercent } = detail;

  return (
    <AppStackPage>
      <StackNavTitle title={course.title} />

      <TabPageHeader
        eyebrow="Learning"
        title="커리큘럼"
        titleAccent="학습"
        description={course.description ?? `${course.title} 강의를 이어서 진행하세요.`}
        variant="stack"
      />

      <CourseDetailHeader
        course={course}
        enrollment={enrollment}
        completedCount={completedCount}
        totalLessons={totalLessons}
        progressPercent={progressPercent}
      />

      <AppSection labelledBy="curriculum-heading">
        <AppSectionHeader title="커리큘럼" titleId="curriculum-heading" />
        <CourseModuleList slug={slug} modules={course.modules} progressMap={progressMap} />
      </AppSection>
    </AppStackPage>
  );
}
