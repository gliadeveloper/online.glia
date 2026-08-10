import { notFound, redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { AssignmentForm } from "@/components/learning/lesson/assignment-form";
import { CompleteLessonButton } from "@/components/learning/lesson/complete-lesson-button";
import { LessonStartedMarker } from "@/components/learning/lesson/lesson-started-marker";
import {
  getLessonZoomUrl,
  lessonHasVideoPlayer,
  LessonMaterialsPanel,
  LessonNavFooter,
  LessonTextBody,
  LessonVideoHero,
} from "@/components/learning/lesson/lesson-player-content";
import { isLessonMarkdownContent } from "@/lib/lesson-markdown-content";
import { LessonLivePanel } from "@/components/learning/lesson/lesson-live-panel";
import { LessonPlayerShell } from "@/components/learning/lesson/lesson-player-shell";
import { QuizPlayer } from "@/components/learning/lesson/quiz-player";
import { EnrollmentExpiredNotice } from "@/components/learning/enrollment-expired-notice";
import "@/components/learning/lesson-player.css";
import { ApiError } from "@/lib/api";
import { getEnrolledCourseDetail } from "@/lib/learning-course-detail";
import { getLessonPlayerContext } from "@/lib/learning";
import { getCourseShopStateBySlug } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type LearningLessonPageProps = {
  params: Promise<{ slug: string; lessonId: string }>;
};

type LessonContext = Awaited<ReturnType<typeof getLessonPlayerContext>>;
type Lesson = LessonContext["lesson"];

function resolveLessonPlayer(lesson: Lesson) {
  if (!lessonHasVideoPlayer(lesson)) {
    return null;
  }

  if (lesson.type === "VIDEO" || lesson.type === "TEXT") {
    return <LessonVideoHero lessonTitle={lesson.title} contents={lesson.contents} />;
  }

  return null;
}

function resolveLessonBody(
  lesson: Lesson,
  slug: string,
  quizAttempt: LessonContext["quizAttempt"],
  assignmentSubmission: LessonContext["assignmentSubmission"],
) {
  return (
    <>
      {lesson.type === "LIVE" ? (
        <LessonLivePanel zoomUrl={getLessonZoomUrl(lesson.contents)} />
      ) : null}

      {(lesson.type === "TEXT" || lesson.type === "VIDEO") &&
      lesson.contents.some((content) => isLessonMarkdownContent(content)) ? (
        <LessonTextBody contents={lesson.contents} description={lesson.description} />
      ) : null}

      {lesson.type === "QUIZ" && lesson.quiz ? (
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
      ) : null}

      {lesson.type === "ASSIGNMENT" && lesson.assignment ? (
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
      ) : null}
    </>
  );
}

function hasLessonBodyContent(lesson: Lesson) {
  if (lesson.type === "LIVE") return true;
  if (lesson.type === "TEXT" || lesson.type === "VIDEO") {
    return Boolean(
      lesson.description ||
        lesson.contents.some((content) => isLessonMarkdownContent(content)),
    );
  }
  if (lesson.type === "QUIZ" && lesson.quiz) return true;
  if (lesson.type === "ASSIGNMENT" && lesson.assignment) return true;
  return false;
}

export default async function LearningLessonPage({ params }: LearningLessonPageProps) {
  const user = await getCurrentUser();
  const { slug, lessonId } = await params;

  if (!user) {
    redirect(`/login?next=/learning/${slug}/lessons/${lessonId}`);
  }

  let context;
  let courseDetail;

  try {
    [context, courseDetail] = await Promise.all([
      getLessonPlayerContext({ userId: user.id, courseSlug: slug, lessonId }),
      getEnrolledCourseDetail(user.id, slug),
    ]);
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

  if (!courseDetail) {
    notFound();
  }

  const { lesson, progress, prevLesson, nextLesson, quizAttempt, assignmentSubmission } = context;
  const status = progress?.status ?? "NOT_STARTED";

  const player = resolveLessonPlayer(lesson);
  const bodyContent = resolveLessonBody(lesson, slug, quizAttempt, assignmentSubmission);
  const showBody = hasLessonBodyContent(lesson);

  const showCompleteButton =
    status !== "COMPLETED" &&
    (lesson.type === "VIDEO" || lesson.type === "TEXT" || lesson.type === "LIVE");

  const actions = showCompleteButton ? (
    <CompleteLessonButton lessonId={lesson.id} courseSlug={slug} compact />
  ) : null;

  const mobileNav = (
    <LessonNavFooter slug={slug} prevLesson={prevLesson} nextLesson={nextLesson} />
  );

  return (
    <AppStackPage className="lesson-player-page">
      <StackNavTitle title={lesson.title} />
      <LessonStartedMarker lessonId={lesson.id} courseSlug={slug} status={status} />

      <LessonPlayerShell
        slug={slug}
        lessonId={lesson.id}
        courseTitle={lesson.module.course.title}
        moduleTitle={lesson.module.title}
        lessonTitle={lesson.title}
        modules={courseDetail.course.modules}
        progressMap={courseDetail.progressMap}
        player={player}
        materials={
          <LessonMaterialsPanel contents={lesson.contents} lessonTitle={lesson.title} />
        }
        actions={actions}
        body={showBody ? bodyContent : null}
        mobileNav={mobileNav}
      />
    </AppStackPage>
  );
}
