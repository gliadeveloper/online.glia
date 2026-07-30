import Link from "next/link";

import { CoachOrderList } from "@/components/coach/coach-order-list";
import { requireCoach } from "@/lib/coach";
import { getCoachProductIds, getCoachOrderStats, listCoachOrders } from "@/lib/coach-orders";
import { formatKrw } from "@/lib/admin";

export default async function CoachOrdersPage() {
  const user = await requireCoach();
  const [orders, productIds, stats] = await Promise.all([
    listCoachOrders(user.id),
    getCoachProductIds(user.id),
    getCoachOrderStats(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Commerce</p>
        <h1 className="text-3xl font-semibold tracking-tight">주문 내역</h1>
        <p className="mt-1 text-zinc-600">
          내 상품 결제 {stats.orderCount}건 · 합계 {formatKrw(stats.paidTotal)}
        </p>
      </div>

      <CoachOrderList orders={orders} coachProductIds={productIds} />
    </div>
  );
}
