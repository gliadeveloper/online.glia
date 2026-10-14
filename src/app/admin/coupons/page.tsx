import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatCouponBenefit, formatCouponCondition } from "@/lib/shop-coupon-math";

function couponPhase(coupon: { isActive: boolean; issueStartsAt: Date; issueEndsAt: Date }, now: Date) {
  if (!coupon.isActive) return { value: "CANCELLED", label: "중지" };
  if (now < coupon.issueStartsAt) return { value: "PENDING", label: "예정" };
  if (now >= coupon.issueEndsAt) return { value: "ARCHIVED", label: "종료" };
  return { value: "PUBLISHED", label: "발급 중" };
}

export default async function AdminCouponsPage() {
  await requireAdmin();
  const now = new Date();
  const coupons = await prisma.shopCoupon.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      products: { include: { product: { select: { title: true } } } },
      _count: { select: { issues: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Commerce</p>
          <h1 className="text-3xl font-semibold tracking-tight">쿠폰</h1>
          <p className="mt-1 text-zinc-600">상품 상세에서 다운로드하고, 결제 때 적용합니다.</p>
        </div>
        <Link href="/admin/coupons/new" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">
          새 쿠폰
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">쿠폰</th>
              <th className="px-5 py-3 font-medium">할인</th>
              <th className="px-5 py-3 font-medium">발급 기간</th>
              <th className="px-5 py-3 font-medium">상품</th>
              <th className="px-5 py-3 font-medium">발급</th>
              <th className="px-5 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-zinc-500">
                  등록된 쿠폰이 없습니다.
                </td>
              </tr>
            ) : null}
            {coupons.map((coupon) => {
              const phase = couponPhase(coupon, now);
              return (
                <tr key={coupon.id} className="hover:bg-zinc-50/80">
                  <td className="px-5 py-4">
                    <Link href={`/admin/coupons/${coupon.id}`} className="font-medium text-zinc-900 hover:text-violet-700">
                      {coupon.name}
                    </Link>
                    <p className="text-xs text-zinc-500">{formatCouponCondition(coupon.minOrderAmount)}</p>
                  </td>
                  <td className="px-5 py-4">{formatCouponBenefit(coupon)}</td>
                  <td className="px-5 py-4 text-zinc-600">
                    {formatDateTime(coupon.issueStartsAt)}
                    <br />
                    {formatDateTime(coupon.issueEndsAt)}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {coupon.products.map((item) => item.product.title).join(", ")}
                  </td>
                  <td className="px-5 py-4">
                    {coupon._count.issues}
                    {coupon.issueLimit != null ? ` / ${coupon.issueLimit}` : ""}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={phase.value} label={phase.label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
