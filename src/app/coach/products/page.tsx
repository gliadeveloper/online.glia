import Link from "next/link";

import { CoachProductList } from "@/components/coach/coach-product-panels";
import { requireCoach } from "@/lib/coach";
import { listCoachProducts } from "@/lib/coach-commerce";

export default async function CoachProductsPage() {
  const user = await requireCoach();
  const products = await listCoachProducts(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Commerce</p>
          <h1 className="text-3xl font-semibold tracking-tight">상품 관리</h1>
          <p className="mt-1 text-zinc-600">LMS·코칭권을 샵에 노출하고 가격을 관리합니다.</p>
        </div>
        <Link
          href="/coach/products/new"
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          새 상품
        </Link>
      </div>

      <CoachProductList products={products} />
    </div>
  );
}
