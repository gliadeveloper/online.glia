import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { courseInclude, courseLevelLabels, courseStatusLabels } from "@/lib/courses";
import { prisma } from "@/lib/prisma";

export default async function AdminCoursesPage() {
  await requireAdmin();

  const courses = await prisma.course.findMany({
    orderBy: { updatedAt: "desc" },
    include: courseInclude,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Catalog</p>
          <h1 className="text-3xl font-semibold tracking-tight">코스</h1>
          <p className="mt-1 text-zinc-600">LMS 강의 메타데이터와 발행 상태를 관리합니다.</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          새 코스
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">코스</th>
              <th className="px-5 py-3 font-medium">강사</th>
              <th className="px-5 py-3 font-medium">레벨</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">모듈</th>
              <th className="px-5 py-3 font-medium">수강</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="font-medium text-zinc-900 hover:text-violet-700"
                  >
                    {course.title}
                  </Link>
                  <p className="font-mono text-xs text-zinc-500">{course.id}</p>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {course.instructor.name ?? course.instructor.email}
                </td>
                <td className="px-5 py-4">{courseLevelLabels[course.level]}</td>
                <td className="px-5 py-4">
                  <StatusBadge value={course.status} label={courseStatusLabels[course.status]} />
                </td>
                <td className="px-5 py-4">{course._count.modules}</td>
                <td className="px-5 py-4">{course._count.enrollments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
