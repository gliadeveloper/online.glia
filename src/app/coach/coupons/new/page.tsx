import Link from "next/link";

import { CouponForm } from "@/app/admin/coupons/coupon-form";
import { requireCoach } from "@/lib/coach";
import { listCoachCouponProducts } from "@/lib/shop-coupon-coach";

export default async function CoachNewCouponPage() {
  const user = await requireCoach();
  const products = await listCoachCouponProducts(user.id, true);

  return (
    <div className="space-y-6">
      <Link href="/coach/coupons" className="text-sm font-medium text-emerald-600">
        ← 쿠폰
      </Link>
      <div>
        <p className="text-sm font-medium text-emerald-600">Commerce</p>
        <h1 className="text-3xl font-semibold tracking-tight">쿠폰 등록</h1>
        <p className="mt-1 text-zinc-600">본인 상품 상세에서 받고, 결제할 때 고릅니다.</p>
      </div>
      <CouponForm
        products={products}
        apiBase="/api/coach/coupons"
        redirectTo="/coach/coupons"
        productsEmptyLabel="본인 상품이 없습니다."
      />
    </div>
  );
}
