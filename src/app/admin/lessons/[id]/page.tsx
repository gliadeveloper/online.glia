import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonAssessmentPanel } from "@/app/admin/lessons/[id]/lesson-assessment-panel";
import { LessonMarkdownEditor } from "@/components/learning/lesson/lesson-markdown-editor";
import { requireAdmin } from "@/lib/admin";
import { getLessonDetail } from "@/lib/assessment-admin";
import { lessonSupportsMarkdownEditor } from "@/lib/lesson-markdown-content";

type Props = { params: Promise<{ id: string }> };

export default async function AdminLessonDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  let lesson;
  try {
    lesson = await getLessonDetail(id);
  } catch {
    notFound();
  }

  const course = lesson.module.course;
  const showMarkdownEditor = lessonSupportsMarkdownEditor(lesson.type);

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/courses/${course.id}/curriculum`}
        className="text-sm font-medium text-violet-600"
      >
        ← {course.title} 커리큘럼
      </Link>

      <div>
        <p className="text-xs text-zinc-500">
          {lesson.module.title} · Lesson {lesson.order}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{lesson.type}</p>
      </div>

      {lesson.description && (
        <p className="rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-600 shadow-sm">
          {lesson.description}
        </p>
      )}

      {lesson.type === "QUIZ" || lesson.type === "ASSIGNMENT" ? (
        <LessonAssessmentPanel
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
      ) : null}

      {showMarkdownEditor ? (
        <LessonMarkdownEditor
          lessonId={lesson.id}
          courseId={course.id}
          contents={lesson.contents}
          apiRole="admin"
        />
      ) : null}

      {lesson.type === "VIDEO" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">동영상 콘텐츠</h2>
            <p className="mt-1 text-sm text-zinc-500">
              YouTube URL은 커리큘럼 편집기에서 추가할 수 있습니다.
            </p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {lesson.contents.filter((content) => content.type === "VIDEO").length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-zinc-500">
                등록된 동영상이 없습니다.
              </li>
            ) : (
              lesson.contents
                .filter((content) => content.type === "VIDEO")
                .map((content) => (
                  <li key={content.id} className="px-5 py-4">
                    <p className="font-medium">{content.type}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {content.title ?? content.url ?? content.id.slice(0, 8)}
                    </p>
                  </li>
                ))
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
