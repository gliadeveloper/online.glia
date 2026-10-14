import Link from "next/link";
import { notFound } from "next/navigation";

import { CouponForm, type CouponFormValues } from "@/app/admin/coupons/coupon-form";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatKstDateTimeLocal } from "@/lib/shop-coupon-time";

type Props = { params: Promise<{ id: string }> };

export default async function EditCouponPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [coupon, products] = await Promise.all([
    prisma.shopCoupon.findUnique({
      where: { id },
      include: { products: { select: { productId: true } } },
    }),
    prisma.product.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!coupon) notFound();

  const initial: CouponFormValues = {
    name: coupon.name,
    discountType: coupon.discountType,
    discountAmount: coupon.discountAmount?.toString() ?? "",
    discountPercent: coupon.discountPercent?.toString() ?? "",
    maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? "",
    minOrderAmount: String(coupon.minOrderAmount),
    issueStartsAt: formatKstDateTimeLocal(coupon.issueStartsAt),
    issueEndsAt: formatKstDateTimeLocal(coupon.issueEndsAt),
    validityKind: coupon.validityKind,
    validStartsAt: coupon.validStartsAt ? formatKstDateTimeLocal(coupon.validStartsAt) : "",
    validEndsAt: coupon.validEndsAt ? formatKstDateTimeLocal(coupon.validEndsAt) : "",
    validDays: coupon.validDays?.toString() ?? "",
    issueLimit: coupon.issueLimit?.toString() ?? "",
    productIds: coupon.products.map((item) => item.productId),
    isActive: coupon.isActive,
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/coupons" className="text-sm font-medium text-violet-600">
        ← 쿠폰
      </Link>
      <div>
        <p className="text-sm font-medium text-violet-600">Commerce</p>
        <h1 className="text-3xl font-semibold tracking-tight">쿠폰 수정</h1>
        <p className="mt-1 text-zinc-600">이미 받은 쿠폰의 할인 조건은 받은 시점 그대로입니다.</p>
      </div>
      <CouponForm products={products} initial={initial} couponId={coupon.id} issuedCount={coupon.issuedCount} />
    </div>
  );
}
