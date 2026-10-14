import Link from "next/link";

import { CouponForm } from "@/app/admin/coupons/coupon-form";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function NewCouponPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/coupons" className="text-sm font-medium text-violet-600">
        ← 쿠폰
      </Link>
      <div>
        <p className="text-sm font-medium text-violet-600">Commerce</p>
        <h1 className="text-3xl font-semibold tracking-tight">쿠폰 등록</h1>
        <p className="mt-1 text-zinc-600">상품 상세에서 받고, 결제할 때 고릅니다.</p>
      </div>
      <CouponForm products={products} />
    </div>
  );
}
