import Link from "next/link";

import { CoachCreateProductForm } from "@/components/coach/coach-product-panels";
import { requireCoach } from "@/lib/coach";
import { getCoachProductCatalog } from "@/lib/coach-commerce";

export default async function CoachNewProductPage() {
  const user = await requireCoach();
  const catalog = await getCoachProductCatalog(user.id);

  const canCreate = catalog.courses.length > 0 || catalog.offerings.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/coach/products" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 상품 목록
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">새 상품</h1>
        <p className="mt-1 text-zinc-600">본인 코스·코칭 상품을 연결해 샵에 등록합니다.</p>
      </div>

      {!canCreate ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-sm text-amber-900">
          <p className="font-medium">먼저 코스 또는 코칭 상품을 만들어 주세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/coach/courses/new" className="rounded-lg bg-white px-3 py-2 font-medium shadow-sm">
              코스 만들기
            </Link>
            <Link href="/coach/coaching" className="rounded-lg bg-white px-3 py-2 font-medium shadow-sm">
              코칭 상품 만들기
            </Link>
          </div>
        </div>
      ) : (
        <CoachCreateProductForm courses={catalog.courses} offerings={catalog.offerings} />
      )}
    </div>
  );
}
