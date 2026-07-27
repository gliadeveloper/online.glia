import Link from "next/link";

import { CreateCoursePanel } from "@/app/admin/courses/new/create-course-panel";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminNewCoursePage() {
  await requireAdmin();

  const instructors = await prisma.user.findMany({
    where: { role: { in: ["COACH", "ADMIN"] } },
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/courses" className="text-sm font-medium text-violet-600">
        ← 코스 목록
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">새 코스</h1>
      <CreateCoursePanel
        instructors={instructors.map((user) => ({
          id: user.id,
          label: user.name ?? user.email,
        }))}
      />
    </div>
  );
}
