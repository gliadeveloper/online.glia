import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachLessonAssessmentPanel } from "@/components/coach/coach-lesson-assessment-panel";
import { CoachLessonEditor } from "@/components/coach/coach-lesson-editor";
import { ApiError } from "@/lib/api";
import { getLessonDetail } from "@/lib/assessment-admin";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { requireCoach } from "@/lib/coach";

type Props = { params: Promise<{ id: string }> };

export default async function CoachLessonPage({ params }: Props) {
  const user = await requireCoach();
  const { id } = await params;

  try {
    await assertCoachOwnsLesson(user.id, id);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "LESSON_NOT_FOUND" || error.code === "FORBIDDEN")) {
      notFound();
    }
    throw error;
  }

  const lesson = await getLessonDetail(id);
  const course = lesson.module.course;

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/courses/${course.id}`}
        className="text-sm font-medium text-emerald-700"
      >
        ← {course.title} 커리큘럼
      </Link>

      <CoachLessonEditor
        lessonId={lesson.id}
        courseId={course.id}
        lessonType={lesson.type}
        lessonTitle={lesson.title}
        contents={lesson.contents}
        courseTitle={course.title}
      />

      <CoachLessonAssessmentPanel
        lessonId={lesson.id}
        lessonType={lesson.type}
        quiz={lesson.quiz}
        assignment={
          lesson.assignment
            ? {
                ...lesson.assignment,
                dueDate: lesson.assignment.dueDate?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}
