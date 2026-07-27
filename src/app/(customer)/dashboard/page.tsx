import Link from "next/link";

import { StatCard } from "@/components/admin/stat-card";
import { getCheckInOverview } from "@/lib/forms";
import { getContinueLearning } from "@/lib/learning";
import { formatKrw } from "@/lib/customer-labels";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [enrollmentCount, entitlementCount, checkIns, continueLearning, recentOrder] =
    await Promise.all([
      prisma.enrollment.count({ where: { userId: user.id, status: "ACTIVE" } }),
      prisma.coachingEntitlement.count({
        where: { userId: user.id, status: "ACTIVE" },
      }),
      getCheckInOverview(user.id),
      getContinueLearning(user.id),
      prisma.order.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, total: true },
      }),
    ]);

  const daily = checkIns.find((item) => item.form.purpose === "DAILY_CHECKIN");
  const weekly = checkIns.find((item) => item.form.purpose === "WEEKLY_CHECKIN");

  const hubs = [
    {
      href: "/shop",
      title: "상품 둘러보기",
      description: "VOD · 코칭 · 번들 패키지",
      stat: "새 강의 시작",
      accent: "violet" as const,
    },
    {
      href: "/lms",
      title: "내 학습",
      description: "수강 중인 강의와 진도",
      stat: `${enrollmentCount}개 수강`,
      accent: "default" as const,
    },
    {
      href: "/coaching",
      title: "코칭 센터",
      description: "1:1 세션 예약과 관리",
      stat: `${entitlementCount}개 코칭권`,
      accent: "emerald" as const,
    },
    {
      href: "/checkin",
      title: "체크인",
      description: "데일리 · 주간 상태 기록",
      stat:
        daily?.hasSubmission && weekly?.hasSubmission
          ? "오늘 기록 완료"
          : "기록하기",
      accent: "amber" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-8 text-white shadow-lg shadow-violet-200">
        <p className="text-sm font-medium text-violet-100">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {user.name ?? "고객"}님, 오늘도 성장해요
        </h1>
        <p className="mt-2 max-w-xl text-violet-100">
          학습, 코칭, 체크인을 한곳에서 이어갈 수 있습니다.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="수강 중" value={enrollmentCount} href="/lms" accent="violet" />
        <StatCard label="코칭권" value={entitlementCount} href="/coaching" accent="emerald" />
        <StatCard
          label="데일리 체크인"
          value={daily?.hasSubmission ? "완료" : "미완료"}
          href="/checkin?tab=daily"
          accent={daily?.hasSubmission ? "emerald" : "amber"}
        />
        <StatCard
          label="최근 주문"
          value={recentOrder ? formatKrw(recentOrder.total) : "—"}
          href="/orders"
        />
      </div>

      {continueLearning && (
        <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Continue Learning
          </p>
          <h2 className="mt-2 text-xl font-semibold">{continueLearning.courseTitle}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            다음: {continueLearning.lesson.module.title} · {continueLearning.lesson.title}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-violet-600"
                style={{ width: `${continueLearning.progressPercent}%` }}
              />
            </div>
            <span className="text-sm text-zinc-500">
              {Math.round(continueLearning.progressPercent)}%
            </span>
            <Link
              href={`/lms/${continueLearning.courseSlug}/lessons/${continueLearning.lesson.id}`}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              이어서 학습
            </Link>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {hubs.map((hub) => (
          <Link
            key={hub.href}
            href={hub.href}
            className={`rounded-2xl border p-6 shadow-sm transition hover:shadow-md ${
              hub.accent === "violet"
                ? "border-violet-200 bg-violet-50/40"
                : hub.accent === "emerald"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : hub.accent === "amber"
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-zinc-200 bg-white"
            }`}
          >
            <p className="text-sm font-medium text-zinc-500">{hub.stat}</p>
            <h2 className="mt-2 text-lg font-semibold">{hub.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{hub.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
