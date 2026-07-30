import Link from "next/link";

import { CoachCourseList } from "@/components/coach/coach-course-panels";
import { summarizeCoachCourses } from "@/lib/coach-courses";
import { requireCoach } from "@/lib/coach";

export default async function CoachCoursesPage() {
  const user = await requireCoach();
  const courses = await summarizeCoachCourses(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">내 코스</h1>
          <p className="mt-1 text-sm text-zinc-500">커리큘럼을 구성하고 발행하세요.</p>
        </div>
        <Link
          href="/coach/courses/new"
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + 새 코스
        </Link>
      </div>

      <CoachCourseList
        courses={courses.map((course) => ({
          ...course,
          updatedAt: course.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
