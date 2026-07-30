import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionActions } from "@/app/admin/coaching/sessions/[id]/session-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { coachingPublicationLabels } from "@/lib/customer-labels";
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
            {session.sessionNo}회차 · {session.title}
          </h1>
          <p className="text-zinc-600">{session.entitlement.coachingOffering.title}</p>
        </div>
        <StatusBadge value={coachingPublicationLabels[session.publicationStatus]} />
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
          <p className="text-xs text-zinc-500">오픈 예정일</p>
          <p className="mt-2 font-medium">{formatDateTime(session.scheduledAt)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">발행</p>
          <p className="mt-2 font-medium">
            {session.publishedAt ? formatDateTime(session.publishedAt) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Q&A</p>
          <p className="mt-2 font-medium">{session.conversation?.messages.length ?? 0}건</p>
        </div>
      </div>

      <SessionActions
        sessionId={session.id}
        title={session.title}
        summary={session.summary}
        scheduledAt={session.scheduledAt.toISOString()}
        bodyMarkdown={session.bodyMarkdown}
        publicationStatus={session.publicationStatus}
        progressStatus={session.progressStatus}
      />

      {session.conversation && session.conversation.messages.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">Q&A</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {session.conversation.messages.map((message) => (
              <li key={message.id} className="px-5 py-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {message.authorRole === "COACH" ? "코치" : "학생"} ·{" "}
                      {message.author.name ?? message.author.email}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                      {message.bodyMarkdown}
                    </p>
                    {message.awaitingReply && (
                      <p className="mt-2 text-xs text-amber-600">답변 대기 중</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-zinc-400">
                    {formatDateTime(message.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
