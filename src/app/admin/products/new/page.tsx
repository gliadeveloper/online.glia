import Link from "next/link";

import { CreateProductPanel } from "@/app/admin/products/new/create-product-panel";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminNewProductPage() {
  await requireAdmin();

  const [courses, offerings] = await Promise.all([
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.coachingOffering.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm font-medium text-violet-600">
        ← 상품 목록
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">새 상품</h1>
      <CreateProductPanel
        courses={courses.map((c) => ({ id: c.id, label: c.title }))}
        offerings={offerings.map((o) => ({ id: o.id, label: o.title }))}
      />
    </div>
  );
}
