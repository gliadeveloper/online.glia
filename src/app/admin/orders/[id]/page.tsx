import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderActions } from "@/app/admin/orders/[id]/order-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, formatKrw, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          product: {
            include: {
              items: {
                include: {
                  course: { select: { title: true } },
                  coachingOffering: { select: { title: true } },
                },
              },
            },
          },
          entitlementGrants: {
            include: {
              enrollment: { select: { id: true, status: true } },
              coachingEntitlement: {
                select: {
                  id: true,
                  status: true,
                  totalSessions: true,
                  usedSessions: true,
                  reservedSessions: true,
                },
              },
            },
          },
        },
      },
      payments: true,
      fulfillments: {
        include: {
          grants: true,
        },
      },
      refunds: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm font-medium text-violet-600">
        ← 주문 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">주문 상세</h1>
          <p className="font-mono text-sm text-zinc-500">{order.id}</p>
        </div>
        <StatusBadge value={order.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">고객</p>
          <p className="mt-2 font-medium">{order.user.name ?? order.user.email}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">결제 금액</p>
          <p className="mt-2 text-xl font-semibold">{formatKrw(order.total)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">주문 일시</p>
          <p className="mt-2 font-medium">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">주문 항목</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {order.lines.map((line) => (
            <li key={line.id} className="px-5 py-4">
              <p className="font-medium">{line.product.title}</p>
              <p className="text-sm text-zinc-500">{formatKrw(line.lineTotal)}</p>
              {line.entitlementGrants.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  {line.entitlementGrants.map((grant) => (
                    <li key={grant.id}>
                      {grant.enrollment
                        ? `수강권 · ${grant.enrollment.status}`
                        : grant.coachingEntitlement
                          ? `코칭권 · ${grant.coachingEntitlement.usedSessions}/${grant.coachingEntitlement.totalSessions}회`
                          : grant.grantType}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">결제</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {order.payments.map((payment) => (
            <li key={payment.id} className="flex justify-between px-5 py-4 text-sm">
              <span>
                {payment.provider} · {payment.providerRef}
              </span>
              <span>
                {formatKrw(payment.amount)} · {payment.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {order.fulfillments.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">이행 (Fulfillment)</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {order.fulfillments.map((f) => (
              <li key={f.id} className="flex justify-between px-5 py-4 text-sm">
                <span>{f.id.slice(0, 10)}…</span>
                <StatusBadge value={f.status} />
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
                <p className="text-zinc-500">{refund.reason ?? "—"} · {refund.status}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OrderActions orderId={order.id} status={order.status} total={order.total} />
    </div>
  );
}
