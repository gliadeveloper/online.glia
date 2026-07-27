import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, formatKrw, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          product: { select: { title: true, slug: true } },
        },
      },
      payments: {
        select: { status: true, amount: true, provider: true, paidAt: true },
        take: 1,
      },
    },
  });

  const paidTotal = orders
    .filter((order) => order.status === "PAID")
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Commerce</p>
        <h1 className="text-3xl font-semibold tracking-tight">주문</h1>
        <p className="mt-1 text-zinc-600">
          결제 완료 합계 {formatKrw(paidTotal)} · 총 {orders.length}건
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">주문</th>
              <th className="px-5 py-3 font-medium">고객</th>
              <th className="px-5 py-3 font-medium">상품</th>
              <th className="px-5 py-3 font-medium">금액</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">결제</th>
              <th className="px-5 py-3 font-medium">일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs text-violet-700 hover:underline"
                  >
                    {order.id.slice(0, 10)}…
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium">{order.user.name ?? "—"}</p>
                  <p className="text-xs text-zinc-500">{order.user.email}</p>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {order.lines.map((line) => line.product.title).join(", ")}
                </td>
                <td className="px-5 py-4 font-medium">{formatKrw(order.total)}</td>
                <td className="px-5 py-4">
                  <StatusBadge value={order.status} />
                </td>
                <td className="px-5 py-4 text-zinc-500">
                  {order.payments[0]
                    ? `${order.payments[0].provider} · ${order.payments[0].status}`
                    : "—"}
                </td>
                <td className="px-5 py-4 text-zinc-500">{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
