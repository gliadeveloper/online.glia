import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachSessionFeedbackPanel } from "@/components/coach/coach-session-feedback-panel";
import { formatDateTime } from "@/lib/admin";
import { getCoachSessionDetail } from "@/lib/coaching-coach";
import { requireCoach } from "@/lib/coach";

type Props = { params: Promise<{ id: string }> };

export default async function CoachSessionDetailPage({ params }: Props) {
  const user = await requireCoach();
  const { id } = await params;

  const session = await getCoachSessionDetail(id, user.id);

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/coach" className="text-sm font-medium text-emerald-600">
        ← 내 세션
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {session.sessionNo}회차 · {session.title}
          </h1>
          <p className="text-zinc-600">
            {session.user.name ?? session.user.email} · {session.entitlement.coachingOffering.title}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">회원</p>
          <p className="mt-2 font-medium">{session.user.name ?? session.user.email}</p>
          <p className="text-sm text-zinc-500">{session.user.email}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">오픈 예정</p>
          <p className="mt-2 font-medium">{formatDateTime(session.scheduledAt)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">회차 피드백</h2>
        <p className="mt-1 text-sm text-zinc-600">회원에게 전달할 피드백을 작성합니다.</p>
        <div className="mt-4">
          <CoachSessionFeedbackPanel
            sessionId={session.id}
            summary={session.summary}
            bodyMarkdown={session.bodyMarkdown}
            bodyMetadata={session.bodyMetadata}
            publicationStatus={session.publicationStatus}
          />
        </div>
      </section>
    </div>
  );
}
