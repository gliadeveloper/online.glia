import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionActions } from "@/app/admin/coaching/sessions/[id]/session-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { sessionInclude } from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCoachingSessionDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const session = await prisma.coachingSession.findUnique({
    where: { id },
    include: sessionInclude,
  });

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/coaching/sessions" className="text-sm font-medium text-violet-600">
        ← 세션 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {session.sessionNo}회차 세션
          </h1>
          <p className="text-zinc-600">{session.entitlement.coachingOffering.title}</p>
        </div>
        <StatusBadge value={session.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">학생</p>
          <p className="mt-2 font-medium">{session.user.name ?? session.user.email}</p>
          <p className="text-sm text-zinc-500">{session.user.email}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">코치</p>
          <p className="mt-2 font-medium">{session.coach.name ?? session.coach.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">예정 시각</p>
          <p className="mt-2 font-medium">{formatDateTime(session.scheduledAt)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">소요</p>
          <p className="mt-2 font-medium">{session.durationMinutes}분</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">미팅</p>
          <p className="mt-2 truncate text-sm">
            {session.meetingUrl ? (
              <a href={session.meetingUrl} className="text-violet-600" target="_blank" rel="noreferrer">
                {session.meetingUrl}
              </a>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      <SessionActions
        sessionId={session.id}
        status={session.status}
        meetingUrl={session.meetingUrl}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">이벤트 타임라인</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {session.events.map((event) => (
            <li key={event.id} className="px-5 py-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : event.toStatus}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {event.actor?.name ?? event.actor?.email ?? "시스템"}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </div>
                <p className="text-xs text-zinc-400">{formatDateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
