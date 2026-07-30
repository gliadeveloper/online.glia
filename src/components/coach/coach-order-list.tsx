import Link from "next/link";

import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { formatDateTime, formatKrw } from "@/lib/admin";
import type { CoachOrderRow } from "@/lib/coach-orders";
import { productKindLabels } from "@/lib/customer-labels";

type CoachOrderListProps = {
  orders: CoachOrderRow[];
  coachProductIds: string[];
};

export function CoachOrderList({ orders, coachProductIds }: CoachOrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
        <p className="font-medium text-zinc-800">주문 내역이 없습니다</p>
        <p className="mt-2 text-sm text-zinc-500">상품이 판매되면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-left text-zinc-500">
          <tr>
            <th className="px-5 py-3 font-medium">주문</th>
            <th className="px-5 py-3 font-medium">고객</th>
            <th className="px-5 py-3 font-medium">내 상품</th>
            <th className="px-5 py-3 font-medium">금액</th>
            <th className="px-5 py-3 font-medium">상태</th>
            <th className="px-5 py-3 font-medium">일시</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((order) => {
            const coachLines = order.lines.filter((line) =>
              coachProductIds.includes(line.productId),
            );

            return (
              <tr key={order.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/coach/orders/${order.id}`}
                    className="font-mono text-xs text-emerald-700 hover:underline"
                  >
                    {order.id.slice(0, 10)}…
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <Link href={`/coach/customers/${order.user.id}`} className="hover:underline">
                    <p className="font-medium">{order.user.name ?? "—"}</p>
                    <p className="text-xs text-zinc-500">{order.user.email}</p>
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {coachLines.map((line) => (
                    <p key={line.id}>
                      {line.product.title}
                      <span className="ml-1 text-xs text-zinc-400">
                        ({productKindLabels[line.product.kind]})
                      </span>
                    </p>
                  ))}
                </td>
                <td className="px-5 py-4 font-medium">{formatKrw(order.total)}</td>
                <td className="px-5 py-4">
                  <OrderStatusPill status={order.status} />
                </td>
                <td className="px-5 py-4 text-zinc-500">{formatDateTime(order.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
