import Link from "next/link";

import { OrderActions } from "@/app/admin/orders/[id]/order-actions";
import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { formatDateTime, formatKrw } from "@/lib/admin-format";
import { productKindLabels } from "@/lib/customer-labels";
import type { CoachOrderDetail } from "@/lib/coach-orders";
import { tossCancelOffer } from "@/lib/order-refund";

type CoachOrderDetailPanelProps = CoachOrderDetail;

export function CoachOrderDetailPanel({ order, coachProductIds }: CoachOrderDetailPanelProps) {
  const coachLines = order.lines.filter((line) => coachProductIds.includes(line.productId));
  const tossCancel = tossCancelOffer(order);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "주문 금액", value: formatKrw(order.total) },
          { label: "상태", value: null },
          { label: "주문일", value: formatDateTime(order.createdAt) },
          { label: "결제일", value: order.paidAt ? formatDateTime(order.paidAt) : "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{item.label}</p>
            {item.label === "상태" ? (
              <div className="mt-2">
                <OrderStatusPill status={order.status} />
              </div>
            ) : (
              <p className="mt-2 font-semibold text-zinc-900">{item.value}</p>
            )}
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">고객</h2>
        </div>
        <div className="px-5 py-4">
          <Link href={`/coach/customers/${order.user.id}`} className="font-medium text-emerald-700 hover:underline">
            {order.user.name ?? order.user.email}
          </Link>
          <p className="text-sm text-zinc-500">{order.user.email}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">내 상품 라인</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {coachLines.map((line) => (
            <li key={line.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{line.product.title}</p>
                  <p className="text-sm text-zinc-500">
                    {productKindLabels[line.product.kind]} · /shop/{line.product.id}
                  </p>
                </div>
                <p className="font-semibold">{formatKrw(line.lineTotal)}</p>
              </div>

              {line.entitlementGrants.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {line.entitlementGrants.map((grant) => (
                    <li key={grant.id} className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                      {grant.enrollment && (
                        <p>
                          수강 부여 · 진도 {grant.enrollment.progressPercent}% · {grant.enrollment.status}
                        </p>
                      )}
                      {grant.coachingEntitlement && (
                        <p>
                          코칭권 · {grant.coachingEntitlement.completedSessions}/
                          {grant.coachingEntitlement.totalSessions}회 · {grant.coachingEntitlement.status}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {order.payments.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">결제</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {order.payments.map((payment) => (
              <li key={payment.id} className="px-5 py-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span>
                    {payment.provider}
                    {payment.environment ? ` · ${payment.environment}` : ""} · {payment.providerRef}
                  </span>
                  <span>
                    {formatKrw(payment.amount)} · {payment.status}
                  </span>
                </div>
                {payment.cardAmount != null ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    카드 {formatKrw(payment.cardAmount)} · 계좌·머니 {formatKrw(payment.chargeAmount ?? 0)} · 쿠폰·할인{" "}
                    {formatKrw(payment.discountAmount ?? 0)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.refunds.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">환불 내역</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {order.refunds.map((refund) => (
              <li key={refund.id} className="px-5 py-4 text-sm">
                <p className="font-medium">{formatKrw(refund.amount)}</p>
                <p className="text-zinc-500">
                  {refund.reason ?? "—"} · {refund.status}
                  {refund.cancelStatus ? ` · ${refund.cancelStatus}` : ""}
                </p>
                {refund.transactionKey ? (
                  <p className="font-mono text-xs text-zinc-400">{refund.transactionKey}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <OrderActions
        orderId={order.id}
        status={order.status}
        checkout={order.checkout}
        total={order.total}
        tossCancel={tossCancel}
        apiBase="/api/coach/orders"
      />
    </div>
  );
}
