import Link from "next/link";

import { CreateOfferingPanel } from "@/app/admin/coaching-offerings/new/create-offering-panel";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminNewCoachingOfferingPage() {
  await requireAdmin();

  const [coaches, courses] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["COACH", "ADMIN"] } },
      select: { id: true, name: true, email: true },
    }),
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/coaching-offerings" className="text-sm font-medium text-violet-600">
        ← 코칭 상품 목록
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">새 코칭 상품</h1>
      <CreateOfferingPanel
        coaches={coaches.map((c) => ({ id: c.id, label: c.name ?? c.email }))}
        courses={courses.map((c) => ({ id: c.id, label: c.title }))}
      />
    </div>
  );
}
