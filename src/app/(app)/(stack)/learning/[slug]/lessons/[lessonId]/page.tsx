import { notFound, redirect } from "next/navigation";

import { AppStackBackLink, AppStackPage } from "@/components/app";
import { AssignmentForm } from "@/components/learning/lesson/assignment-form";
import { CompleteLessonButton } from "@/components/learning/lesson/complete-lesson-button";
import { LessonStartedMarker } from "@/components/learning/lesson/lesson-started-marker";
import {
  LessonContentSection,
  LessonNavFooter,
  LessonPlayerHeader,
} from "@/components/learning/lesson/lesson-player-sections";
import { LessonLivePanel } from "@/components/learning/lesson/lesson-live-panel";
import { QuizPlayer } from "@/components/learning/lesson/quiz-player";
import { EnrollmentExpiredNotice } from "@/components/learning/enrollment-expired-notice";
import { ProgressStatusPill } from "@/components/learning/progress-status-pill";
import { ApiError } from "@/lib/api";
import { getLessonPlayerContext } from "@/lib/learning";
import { buildLiveSessionView, getLiveContentMetadataFromLesson } from "@/lib/live-session";
import { getEnrolledCourseDetail } from "@/lib/learning-course-detail";
import { getCourseShopStateBySlug } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type LearningLessonPageProps = {
  params: Promise<{ slug: string; lessonId: string }>;
};

export default async function LearningLessonPage({ params }: LearningLessonPageProps) {
  const user = await getCurrentUser();
  const { slug, lessonId } = await params;

  if (!user) {
    redirect(`/login?next=/learning/${slug}/lessons/${lessonId}`);
  }

  let context;
  try {
    context = await getLessonPlayerContext({
      userId: user.id,
      courseSlug: slug,
      lessonId,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === "ENROLLMENT_EXPIRED") {
      const detail = await getEnrolledCourseDetail(user.id, slug);
      if (detail?.accessState === "expired") {
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
    }

    notFound();
  }

  const { lesson, progress, prevLesson, nextLesson, quizAttempt, assignmentSubmission } = context;
  const status = progress?.status ?? "NOT_STARTED";
  const liveSession =
    lesson.type === "LIVE"
      ? buildLiveSessionView(getLiveContentMetadataFromLesson(lesson.contents))
      : null;

  return (
    <AppStackPage>
      <StackNavTitle title={lesson.title} />
      <LessonStartedMarker lessonId={lesson.id} courseSlug={slug} status={status} />

      <AppStackBackLink href={`/learning/${slug}`}>← {lesson.module.course.title}</AppStackBackLink>

      <LessonPlayerHeader
        moduleTitle={lesson.module.title}
        lessonType={lesson.type}
        lessonTitle={lesson.title}
        description={lesson.description}
        statusPill={<ProgressStatusPill status={status} />}
      />

      {(lesson.type === "VIDEO" || lesson.type === "TEXT") && (
        <>
          <LessonContentSection
            lessonId={lesson.id}
            courseSlug={slug}
            lessonTitle={lesson.title}
            contents={lesson.contents}
          />
          {status !== "COMPLETED" && (
            <CompleteLessonButton lessonId={lesson.id} courseSlug={slug} />
          )}
        </>
      )}

      {lesson.type === "LIVE" && liveSession && (
        <>
          <LessonLivePanel
            lessonId={lesson.id}
            courseSlug={slug}
            initialSession={liveSession}
          />
          {status !== "COMPLETED" && (
            <CompleteLessonButton lessonId={lesson.id} courseSlug={slug} />
          )}
        </>
      )}

      {lesson.type === "QUIZ" && lesson.quiz && (
        <QuizPlayer
          quizId={lesson.quiz.id}
          courseSlug={slug}
          title={lesson.quiz.title}
          description={lesson.quiz.description}
          passingScore={lesson.quiz.passingScore}
          questions={lesson.quiz.questions}
          previousAttempt={
            quizAttempt
              ? {
                  score: quizAttempt.score,
                  isPassed: quizAttempt.isPassed,
                  submittedAt: quizAttempt.submittedAt?.toISOString() ?? null,
                }
              : null
          }
        />
      )}

      {lesson.type === "ASSIGNMENT" && lesson.assignment && (
        <AssignmentForm
          assignmentId={lesson.assignment.id}
          courseSlug={slug}
          title={lesson.assignment.title}
          description={lesson.assignment.description}
          maxScore={lesson.assignment.maxScore}
          dueDate={lesson.assignment.dueDate?.toISOString() ?? null}
          existing={
            assignmentSubmission
              ? {
                  content: assignmentSubmission.content,
                  status: assignmentSubmission.status,
                  score: assignmentSubmission.score,
                  feedback: assignmentSubmission.feedback,
                  submittedAt: assignmentSubmission.submittedAt?.toISOString() ?? null,
                }
              : null
          }
        />
      )}

      <LessonNavFooter slug={slug} prevLesson={prevLesson} nextLesson={nextLesson} />
    </AppStackPage>
  );
}
