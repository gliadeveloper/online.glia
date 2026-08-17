import Link from "next/link";

import { formatDateTime, formatKrw } from "@/lib/admin-format";
import type { getCoachCustomerDetail } from "@/lib/coach-customers";
import { OrderStatusPill } from "@/components/orders/order-status-pill";

type CoachCustomerDetail = Awaited<ReturnType<typeof getCoachCustomerDetail>>;

export function CoachCustomerDetailPanel({ detail }: { detail: CoachCustomerDetail }) {
  const { user, enrollments, entitlements, sessions, orders } = detail;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-2xl font-semibold text-zinc-900">{user.name ?? "이름 없음"}</p>
        <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
        <p className="mt-2 text-xs text-zinc-400">가입 {formatDateTime(user.createdAt)}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">LMS 수강</h2>
        </div>
        {enrollments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">수강 중인 코스가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} className="px-5 py-4">
                <p className="font-medium">{enrollment.course.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  진도 {enrollment.progressPercent}% · {enrollment.status} ·{" "}
                  {formatDateTime(enrollment.enrolledAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">코칭권</h2>
        </div>
        {entitlements.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">코칭권이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {entitlements.map((entitlement) => (
              <li key={entitlement.id} className="px-5 py-4">
                <p className="font-medium">{entitlement.coachingOffering.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {entitlement.completedSessions}/{entitlement.totalSessions}회 · {entitlement.status} ·
                  ~{formatDateTime(entitlement.validUntil)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">코칭 세션</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">세션이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {sessions.map((session) => (
              <li key={session.id} className="px-5 py-4">
                <Link
                  href={`/coach/sessions/${session.id}`}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {session.sessionNo}회차 · {session.title}
                </Link>
                <p className="mt-1 text-sm text-zinc-500">
                  {session.entitlement.coachingOffering.title} · {formatDateTime(session.scheduledAt)} ·{" "}
                  {session.progressStatus}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">주문 (내 상품)</h2>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">관련 주문이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {orders.map((order) => (
              <li key={order.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/coach/orders/${order.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {order.lines.map((line) => line.product.title).join(", ")}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-500">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatKrw(order.total)}</p>
                    <OrderStatusPill status={order.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
