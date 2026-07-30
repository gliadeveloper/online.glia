import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachSessionFeedbackPanel } from "@/components/coach/coach-session-feedback-panel";
import { CoachShareRequestPanel } from "@/components/coach/coach-share-request-panel";
import { CheckInShareReportView } from "@/components/checkin/check-in-share-report-view";
import { formatDateTime } from "@/lib/admin";
import { parseReportContent } from "@/lib/checkin-share/build-report";
import { shareGrantStatusLabel } from "@/lib/checkin-share/grants";
import { getCoachSessionDetail } from "@/lib/coaching-coach";
import { requireCoach } from "@/lib/coach";
import { getWeekPeriodKey } from "@/lib/forms";

type Props = { params: Promise<{ id: string }> };

export default async function CoachSessionDetailPage({ params }: Props) {
  const user = await requireCoach();
  const { id } = await params;

  const session = await getCoachSessionDetail(id, user.id);

  if (!session) {
    notFound();
  }

  const grant = session.checkInShareGrant;
  const report = session.checkInShareReport;
  const sessionWeekKey = getWeekPeriodKey("Asia/Seoul", session.scheduledAt);

  const canRequest =
    !grant || grant.status === "PENDING" || grant.status === "DECLINED" || grant.status === "CANCELLED";

  const reportContent = report ? parseReportContent(report.contentJson) : null;

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
        {grant && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
            공유 {shareGrantStatusLabel(grant.status)}
          </span>
        )}
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
          <p className="mt-1 text-xs text-zinc-400">세션 주 앵커 {sessionWeekKey}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">체크인 공유 요청</h2>
        <p className="mt-1 text-sm text-zinc-600">
          회원이 수락하면 선택한 범위의 체크인이 한 페이지 리포트로 저장됩니다.
        </p>
        <div className="mt-4">
          {grant?.status === "GRANTED" ? (
            <p className="text-sm text-emerald-700">
              회원이 공유를 수락했습니다. 아래 리포트를 확인하고 피드백을 작성하세요.
            </p>
          ) : (
            <CoachShareRequestPanel
              sessionId={session.id}
              initialScopeType={grant?.scopeType ?? "WEEK"}
              initialWeekPeriodKey={grant?.weekPeriodKey ?? sessionWeekKey}
              initialStartDate={grant?.startDate ?? null}
              initialEndDate={grant?.endDate ?? null}
              initialMessage={grant?.coachMessage ?? null}
              initialStatus={grant?.status ?? null}
              canRequest={canRequest}
            />
          )}
        </div>
      </section>

      {reportContent && report && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">공유된 체크인 리포트</h2>
              <p className="text-sm text-zinc-500">
                {report.scopeLabel} · {formatDateTime(report.generatedAt)} 스냅샷
              </p>
            </div>
            <Link
              href={`/coach/share-reports/${report.id}`}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              전체 화면
            </Link>
          </div>
          <CheckInShareReportView content={reportContent} mode="readonly" />
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">회차 피드백</h2>
        <p className="mt-1 text-sm text-zinc-600">공유된 기록을 바탕으로 회원에게 전달할 피드백을 작성합니다.</p>
        <div className="mt-4">
          <CoachSessionFeedbackPanel
            sessionId={session.id}
            summary={session.summary}
            bodyMarkdown={session.bodyMarkdown}
            publicationStatus={session.publicationStatus}
            hasSharedReport={Boolean(report)}
          />
        </div>
      </section>
    </div>
  );
}
