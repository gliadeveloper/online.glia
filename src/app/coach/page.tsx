import Link from "next/link";

import { shareGrantStatusLabel } from "@/lib/checkin-share/grants";
import { listCoachSessions } from "@/lib/coaching-coach";
import { requireCoach } from "@/lib/coach";
import { getCoachDashboardStats } from "@/lib/coach-customers";
import { formatDateTime, formatKrw } from "@/lib/admin";

const statLinks = [
  { key: "productCount", label: "상품", href: "/coach/products" },
  { key: "orderCount", label: "결제 주문", href: "/coach/orders" },
  { key: "customerCount", label: "고객", href: "/coach/customers" },
  { key: "courseCount", label: "코스", href: "/coach/courses" },
  { key: "liveCount", label: "라이브 레슨", href: "/coach/live" },
  { key: "entitlementCount", label: "활성 코칭권", href: "/coach/coaching" },
  { key: "sessionCount", label: "코칭 세션", href: "/coach/coaching" },
] as const;

export default async function CoachDashboardPage() {
  const user = await requireCoach();
  const [stats, sessions] = await Promise.all([
    getCoachDashboardStats(user.id),
    listCoachSessions(user.id),
  ]);

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-emerald-600">Coach Portal</p>
        <h1 className="text-3xl font-semibold tracking-tight">코치 홈</h1>
        <p className="mt-1 text-zinc-600">
          상품 판매, LMS, 라이브, 코칭을 한곳에서 운영합니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statLinks.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
          >
            <p className="text-sm text-zinc-500">{item.label}</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">
              {stats[item.key]}
            </p>
          </Link>
        ))}
      </div>

      {stats.paidTotal > 0 && (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          결제 완료 매출 합계 <span className="font-semibold">{formatKrw(stats.paidTotal)}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/coach/products/new"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          상품 만들기
        </Link>
        <Link
          href="/coach/orders"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
        >
          주문 내역
        </Link>
        <Link
          href="/coach/live"
          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800"
        >
          라이브 일정
        </Link>
        <Link
          href="/coach/courses/new"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
        >
          코스 만들기
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">최근 코칭 세션</h2>
          <Link href="/coach/coaching" className="text-sm text-emerald-700 hover:underline">
            전체 보기
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
            배정된 세션이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const grant = session.checkInShareGrant;

              return (
                <Link
                  key={session.id}
                  href={`/coach/sessions/${session.id}`}
                  className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {session.sessionNo}회차 · {session.title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {session.user.name ?? session.user.email} ·{" "}
                        {session.entitlement.coachingOffering.title}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      {grant ? (
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          공유 {shareGrantStatusLabel(grant.status)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">공유 미요청</span>
                      )}
                      <p className="mt-2 text-zinc-500">{formatDateTime(session.scheduledAt)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
