import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachCourseWorkspace } from "@/components/coach/coach-course-workspace";
import { buildCoursePublishChecklist, getCoachCourseDetail } from "@/lib/coach-courses";
import { requireCoach } from "@/lib/coach";
import { ApiError } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

export default async function CoachCourseDetailPage({ params }: Props) {
  const user = await requireCoach();
  const { id } = await params;

  let course;
  try {
    course = await getCoachCourseDetail(user.id, id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "COURSE_NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const checklist = buildCoursePublishChecklist(course);

  return (
    <div className="space-y-8">
      <Link href="/coach/courses" className="text-sm font-medium text-emerald-700">
        ← 내 코스
      </Link>

      <CoachCourseWorkspace
        courseId={course.id}
        title={course.title}
        slug={course.slug}
        description={course.description}
        level={course.level}
        status={course.status}
        checklist={checklist}
        modules={course.modules.map((module) => ({
          id: module.id,
          title: module.title,
          description: module.description,
          order: module.order,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            order: lesson.order,
            duration: lesson.duration,
            isFree: lesson.isFree,
            contents: lesson.contents.map((content) => ({
              id: content.id,
              type: content.type,
              title: content.title,
              url: content.url,
              body: content.body,
              metadata: content.metadata,
            })),
            quiz: lesson.quiz,
            assignment: lesson.assignment,
          })),
        }))}
      />
    </div>
  );
}
