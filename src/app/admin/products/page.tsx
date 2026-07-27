import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatKrw, requireAdmin } from "@/lib/admin";
import { getProductDisplayPrice, productInclude, productKindLabels } from "@/lib/products";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
    include: productInclude,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Catalog</p>
          <h1 className="text-3xl font-semibold tracking-tight">상품</h1>
          <p className="mt-1 text-zinc-600">VOD · 코칭 · 번들 SKU를 관리합니다.</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          새 상품
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">상품</th>
              <th className="px-5 py-3 font-medium">종류</th>
              <th className="px-5 py-3 font-medium">가격</th>
              <th className="px-5 py-3 font-medium">구성</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">주문</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-medium text-zinc-900 hover:text-violet-700"
                  >
                    {product.title}
                  </Link>
                  <p className="font-mono text-xs text-zinc-500">{product.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge value={product.kind} label={productKindLabels[product.kind]} />
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium">{formatKrw(getProductDisplayPrice(product))}</p>
                  {product.salePrice && (
                    <p className="text-xs text-zinc-400 line-through">
                      {formatKrw(product.listPrice)}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {product.items
                    .map(
                      (item) =>
                        item.course?.title ??
                        item.coachingOffering?.title ??
                        item.kind,
                    )
                    .join(" + ")}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge
                    value={product.isActive ? "PUBLISHED" : "ARCHIVED"}
                    label={product.isActive ? "활성" : "비활성"}
                  />
                </td>
                <td className="px-5 py-4">{product._count.orderLines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
