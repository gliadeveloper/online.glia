import Link from "next/link";

import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatDateTime,
  formatKrw,
  getAdminOverview,
  purposeLabels,
  requireAdmin,
} from "@/lib/admin";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const { stats, today, weekKey, recentSubmissions, recentOrders, recentAuditLogs } =
    await getAdminOverview();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-violet-600">Operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">관리자 대시보드</h1>
        <p className="text-zinc-600">
          {user.name ?? "Admin"}님, Glia Academy 운영 현황입니다.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="오늘 데일리 체크인"
          value={stats.todayDailyCount}
          hint={`기준일 ${today}`}
          href="/admin/checkins?purpose=DAILY_CHECKIN"
          accent="emerald"
        />
        <StatCard
          label="이번 주 주간 체크인"
          value={stats.todayWeeklyCount}
          hint={`주차 ${weekKey}`}
          href="/admin/checkins?purpose=WEEKLY_CHECKIN"
          accent="violet"
        />
        <StatCard
          label="활성 상품"
          value={stats.activeProducts}
          hint={`전체 ${stats.products} SKU`}
          href="/admin/products"
        />
        <StatCard
          label="발행 코스"
          value={stats.publishedCourses}
          hint={`전체 ${stats.courses} 코스`}
          href="/admin/courses"
          accent="violet"
        />
        <StatCard
          label="예정 코칭 세션"
          value={stats.upcomingSessions}
          href="/admin/coaching/sessions"
          accent="amber"
        />
        <StatCard
          label="발행된 폼"
          value={stats.publishedForms}
          hint={`초안 ${stats.draftForms}`}
          href="/admin/forms"
        />
        <StatCard
          label="결제 완료 주문"
          value={stats.paidOrders}
          hint={`${formatKrw(stats.revenue)}`}
          href="/admin/orders"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">최근 체크인</h2>
            <Link href="/admin/checkins" className="text-sm font-medium text-violet-600">
              전체 보기
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {recentSubmissions.length === 0 ? (
              <li className="px-5 py-8 text-sm text-zinc-500">아직 제출 기록이 없습니다.</li>
            ) : (
              recentSubmissions.map((submission) => (
                <li key={submission.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {submission.user.name ?? submission.user.email}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500">{submission.form.title}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge
                        value={submission.form.purpose}
                        label={purposeLabels[submission.form.purpose]}
                      />
                      <p className="mt-2 text-xs text-zinc-400">{submission.checkInDate}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">최근 주문</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-violet-600">
              전체 보기
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {recentOrders.length === 0 ? (
              <li className="px-5 py-8 text-sm text-zinc-500">주문 내역이 없습니다.</li>
            ) : (
              recentOrders.map((order) => (
                <li key={order.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {order.user.name ?? order.user.email}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {order.lines.map((line) => line.product.title).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge value={order.status} />
                      <p className="mt-2 text-sm font-medium">{formatKrw(order.total)}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">최근 감사 로그</h2>
          <Link href="/admin/audit-logs" className="text-sm font-medium text-violet-600">
            전체 보기
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">시간</th>
                <th className="px-5 py-3 font-medium">행위자</th>
                <th className="px-5 py-3 font-medium">액션</th>
                <th className="px-5 py-3 font-medium">엔티티</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentAuditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-5 py-3 text-zinc-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-5 py-3">
                    {log.actor?.name ?? log.actor?.email ?? "시스템"}
                  </td>
                  <td className="px-5 py-3 font-medium">{log.action}</td>
                  <td className="px-5 py-3 text-zinc-500">
                    {log.entityType} · {log.entityId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
