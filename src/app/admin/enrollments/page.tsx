import Link from "next/link";

import { GrantEnrollmentPanel } from "@/app/admin/enrollments/grant-enrollment-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminEnrollmentsPage() {
  await requireAdmin();

  const [enrollments, users, courses] = await Promise.all([
    prisma.enrollment.findMany({
      orderBy: { enrolledAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, email: true },
      orderBy: { email: "asc" },
    }),
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">수강 관리</h1>
      </div>

      <GrantEnrollmentPanel
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        courses={courses.map((c) => ({ id: c.id, label: c.title }))}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">사용자</th>
              <th className="px-5 py-3 font-medium">코스</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">진도</th>
              <th className="px-5 py-3 font-medium">등록일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {enrollments.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link href={`/admin/users/${e.user.id}`} className="font-medium hover:text-violet-700">
                    {e.user.name ?? e.user.email}
                  </Link>
                </td>
                <td className="px-5 py-4">{e.course.title}</td>
                <td className="px-5 py-4"><StatusBadge value={e.status} /></td>
                <td className="px-5 py-4">{Math.round(e.progressPercent)}%</td>
                <td className="px-5 py-4 text-zinc-500">{formatDateTime(e.enrolledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
