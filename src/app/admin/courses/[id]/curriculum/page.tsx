import Link from "next/link";
import { notFound } from "next/navigation";

import { CurriculumEditor } from "@/app/admin/courses/[id]/curriculum/curriculum-editor";
import { CourseActions } from "@/app/admin/courses/[id]/course-actions";
import { requireAdmin } from "@/lib/admin";
import { courseStatusLabels, courseLevelLabels } from "@/lib/courses";
import { getCourseCurriculum } from "@/lib/curriculum-admin";

type Props = { params: Promise<{ id: string }> };

export default async function CourseCurriculumPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  let course;
  try {
    course = await getCourseCurriculum(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href={`/admin/courses/${id}`} className="text-sm font-medium text-violet-600">
        ← 코스 상세
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-sm text-zinc-500">
            {courseStatusLabels[course.status]} · {courseLevelLabels[course.level]}
          </p>
        </div>
        <CourseActions courseId={course.id} status={course.status} />
      </div>

      <CurriculumEditor courseId={course.id} modules={course.modules} />
    </div>
  );
}
