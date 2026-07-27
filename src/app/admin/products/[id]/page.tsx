import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductActions } from "@/app/admin/products/[id]/product-actions";
import { ProductEditPanel } from "@/app/admin/products/[id]/product-edit-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatKrw, requireAdmin } from "@/lib/admin";
import { getProductDisplayPrice, productInclude, productKindLabels } from "@/lib/products";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminProductDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!product) {
    notFound();
  }

  const [courses, offerings] = await Promise.all([
    prisma.course.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.coachingOffering.findMany({
      where: { isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm font-medium text-violet-600">
        ← 상품 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
          <p className="font-mono text-sm text-zinc-500">{product.slug}</p>
        </div>
        <ProductActions productId={product.id} isActive={product.isActive} />
        <ProductEditPanel
          productId={product.id}
          kind={product.kind}
          title={product.title}
          description={product.description}
          listPrice={product.listPrice}
          salePrice={product.salePrice}
          items={product.items}
          courses={courses.map((course) => ({ id: course.id, label: course.title }))}
          offerings={offerings.map((offering) => ({ id: offering.id, label: offering.title }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">종류</p>
          <div className="mt-2">
            <StatusBadge value={product.kind} label={productKindLabels[product.kind]} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">판매가</p>
          <p className="mt-2 text-xl font-semibold">
            {formatKrw(getProductDisplayPrice(product))}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">주문 연결</p>
          <p className="mt-2 text-xl font-semibold">{product._count.orderLines}건</p>
        </div>
      </div>

      {product.description && (
        <p className="rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-600 shadow-sm">
          {product.description}
        </p>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">SKU 구성</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {product.items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <p className="font-medium">{item.kind}</p>
              <p className="mt-1 text-sm text-zinc-600">
                {item.course?.title ?? item.coachingOffering?.title ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
