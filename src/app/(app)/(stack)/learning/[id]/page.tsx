import { notFound, redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { EnrollmentExpiredNotice } from "@/components/learning/enrollment-expired-notice";
import { getEnrolledCourseDetail, resumeLessonHref, resumeLessonId } from "@/lib/learning-course-detail";
import { getCourseShopStateById } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type LearningCoursePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LearningCoursePage({ params }: LearningCoursePageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect(`/login?next=/learning/${id}`);
  }

  const detail = await getEnrolledCourseDetail(user.id, id);
  if (!detail) {
    notFound();
  }

  if (detail.accessState === "expired") {
    const courseShopState = await getCourseShopStateById(user.id, id);

    return (
      <AppStackPage>
        <StackNavTitle title={detail.course.title} />
        <EnrollmentExpiredNotice
          courseTitle={detail.course.title}
          enrollment={detail.enrollment}
          extendHref={courseShopState?.kind === "expired" ? courseShopState.extendHref : "/shop"}
          restoreHref={courseShopState?.kind === "expired" ? courseShopState.restoreHref : undefined}
        />
      </AppStackPage>
    );
  }

  if (detail.accessState === "blocked") {
    notFound();
  }

  redirect(resumeLessonHref(id, resumeLessonId(detail.course.modules, detail.progressMap)));
}
