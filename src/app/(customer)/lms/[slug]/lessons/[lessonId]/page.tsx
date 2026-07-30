import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentForm } from "@/components/learning/lesson/assignment-form";
import { CompleteLessonButton } from "@/components/learning/lesson/complete-lesson-button";
import { LessonStartedMarker } from "@/components/learning/lesson/lesson-started-marker";
import {
  LessonContentSection,
  LessonNavFooter,
  LessonPlayerHeader,
} from "@/components/learning/lesson/lesson-player-sections";
import { QuizPlayer } from "@/components/learning/lesson/quiz-player";
import { ProgressPill } from "@/components/customer/progress-pill";
import { getCurrentUser } from "@/lib/session";
import { getLessonPlayerContext } from "@/lib/learning";

type Props = {
  params: Promise<{ slug: string; lessonId: string }>;
};

/** @deprecated Use `/learning/[slug]/lessons/[lessonId]` */
export default async function LmsLessonPlayerPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { slug, lessonId } = await params;

  let context;
  try {
    context = await getLessonPlayerContext({
      userId: user.id,
      courseSlug: slug,
      lessonId,
    });
  } catch {
    notFound();
  }

  const { lesson, progress, prevLesson, nextLesson, quizAttempt, assignmentSubmission } = context;
  const status = progress?.status ?? "NOT_STARTED";
  const course = lesson.module.course;

  return (
    <div className="space-y-6">
      <LessonStartedMarker lessonId={lesson.id} courseSlug={slug} status={status} />
      <div>
        <Link
          href={`/lms/${slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          ← {course.title}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">
              {lesson.module.title} · {lesson.type}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
          </div>
          <ProgressPill status={status} />
        </div>
        {lesson.description && (
          <p className="mt-3 text-zinc-600">{lesson.description}</p>
        )}
      </div>

      {(lesson.type === "VIDEO" || lesson.type === "TEXT") && (
        <section className="space-y-4">
          <LessonContentSection lessonTitle={lesson.title} contents={lesson.contents} />
          {status !== "COMPLETED" && (
            <CompleteLessonButton lessonId={lesson.id} courseSlug={slug} />
          )}
        </section>
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

      <nav className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-6">
        {prevLesson ? (
          <Link
            href={`/lms/${slug}/lessons/${prevLesson.id}`}
            className="text-sm font-medium text-zinc-600 hover:text-violet-700"
          >
            ← {prevLesson.title}
          </Link>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Link
            href={`/lms/${slug}/lessons/${nextLesson.id}`}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            다음: {nextLesson.title} →
          </Link>
        ) : (
          <Link
            href={`/lms/${slug}`}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
          >
            커리큘럼으로
          </Link>
        )}
      </nav>
    </div>
  );
}
