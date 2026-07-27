import Link from "next/link";

import { BookSessionForm } from "@/app/(customer)/coaching/book-session-form";
import { SessionCard } from "@/app/(customer)/coaching/session-card";
import { coachingEntitlementLabels, coachingSessionLabels } from "@/lib/customer-labels";
import { getRemainingSessions } from "@/lib/coaching";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function CoachingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [entitlements, sessions] = await Promise.all([
    prisma.coachingEntitlement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        coachingOffering: {
          select: {
            title: true,
            sessionMinutes: true,
            totalSessions: true,
            validDays: true,
          },
        },
        course: { select: { title: true, slug: true } },
      },
    }),
    prisma.coachingSession.findMany({
      where: { userId: user.id },
      orderBy: { scheduledAt: "desc" },
      include: {
        coach: { select: { name: true, email: true } },
        intake: true,
      },
    }),
  ]);

  const upcoming = sessions.filter((session) =>
    ["SCHEDULED", "CONFIRMED", "RESCHEDULED", "IN_PROGRESS"].includes(session.status),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">코칭 센터</h1>
        <p className="text-zinc-600">1:1 코칭권과 예약된 세션을 관리하세요.</p>
      </header>

      {entitlements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-600">보유 중인 코칭권이 없습니다.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            코칭 상품 보기
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {entitlements.map((entitlement) => {
            const remaining = getRemainingSessions(entitlement);

            return (
              <article
                key={entitlement.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{entitlement.coachingOffering.title}</h3>
                    {entitlement.course && (
                      <p className="mt-1 text-sm text-zinc-500">
                        연결 강의: {entitlement.course.title}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    {coachingEntitlementLabels[entitlement.status]}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "잔여", value: `${remaining}회` },
                    { label: "총 회차", value: `${entitlement.totalSessions}회` },
                    {
                      label: "만료",
                      value: entitlement.validUntil.toLocaleDateString("ko-KR"),
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-zinc-50 px-3 py-2">
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                {entitlement.status === "ACTIVE" && remaining > 0 && (
                  <BookSessionForm
                    entitlementId={entitlement.id}
                    sessionMinutes={entitlement.coachingOffering.sessionMinutes}
                  />
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">예정된 세션</h2>
          <span className="text-sm text-zinc-500">{upcoming.length}건</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
            예정된 코칭 세션이 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((session) => {
              const intake = session.intake?.answers as { goal?: string } | null;
              return (
                <SessionCard
                  key={session.id}
                  sessionId={session.id}
                  sessionNo={session.sessionNo}
                  coachName={session.coach.name ?? session.coach.email}
                  scheduledAt={session.scheduledAt.toISOString()}
                  durationMinutes={session.durationMinutes}
                  status={session.status}
                  meetingUrl={session.meetingUrl}
                  goal={intake?.goal ?? null}
                  canCancel
                />
              );
            })}
          </ul>
        )}
      </section>

      {sessions.length > upcoming.length && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">지난 세션</h2>
          <ul className="space-y-3">
            {sessions
              .filter((session) => !upcoming.some((item) => item.id === session.id))
              .map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {session.sessionNo}회차 · {session.coach.name ?? session.coach.email}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {session.scheduledAt.toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {coachingSessionLabels[session.status]}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
