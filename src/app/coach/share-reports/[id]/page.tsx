import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckInShareReportView } from "@/components/checkin/check-in-share-report-view";
import { formatDateTime } from "@/lib/admin";
import { getShareReportForCoach } from "@/lib/checkin-share/grants";
import { requireCoach } from "@/lib/coach";

type Props = { params: Promise<{ id: string }> };

export default async function CoachShareReportPage({ params }: Props) {
  const user = await requireCoach();
  const { id } = await params;

  let report;
  try {
    report = await getShareReportForCoach(id, user.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href={`/coach/sessions/${report.sessionId}`} className="text-sm font-medium text-emerald-600">
        ← 세션으로 돌아가기
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">체크인 공유 리포트</h1>
        <p className="mt-1 text-zinc-600">
          {report.user.name ?? report.user.email} · {report.session.sessionNo}회차 · {report.scopeLabel}
        </p>
        <p className="text-sm text-zinc-500">스냅샷 {formatDateTime(report.generatedAt)}</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <CheckInShareReportView content={report.content} mode="readonly" />
      </div>
    </div>
  );
}
