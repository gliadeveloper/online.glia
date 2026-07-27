import Link from "next/link";

import { formatKrw, orderStatusLabels, productKindLabels } from "@/lib/customer-labels";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lines: {
        include: {
          product: { select: { title: true, kind: true, slug: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">주문 내역</h1>
        <p className="text-zinc-600">구매한 상품과 결제 상태를 확인하세요.</p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-600">아직 주문 내역이 없습니다.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            상품 보러 가기
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-violet-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {order.lines.map((line) => line.product.title).join(", ")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {order.createdAt.toLocaleString("ko-KR")}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {order.lines
                        .map((line) => productKindLabels[line.product.kind])
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatKrw(order.total)}</p>
                    <p className="mt-1 text-xs font-medium text-violet-700">
                      {orderStatusLabels[order.status]}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
