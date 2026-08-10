import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { formatDateTime } from "@/lib/admin-format";
import {
  formatReportTargetSummary,
  listPendingPostReports,
} from "@/lib/post-moderation";
import {
  postReportReasonLabels,
  postReportStatusLabels,
} from "@/lib/post-reports";
import { displayAuthorName } from "@/lib/post-display";

import { ReportActions } from "./report-actions";

export default async function AdminCommunityReportsPage() {
  await requireAdmin();

  const reports = await listPendingPostReports();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Community</p>
        <h1 className="text-3xl font-semibold tracking-tight">커뮤니티 신고</h1>
        <p className="mt-1 text-zinc-600">대기 중인 신고를 검토하고 콘텐츠를 조치합니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {reports.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">대기 중인 신고가 없습니다.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">대상</th>
                <th className="px-5 py-3 font-medium">신고자</th>
                <th className="px-5 py-3 font-medium">사유</th>
                <th className="px-5 py-3 font-medium">상태</th>
                <th className="px-5 py-3 font-medium">접수</th>
                <th className="px-5 py-3 font-medium">조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reports.map((report) => {
                const postSlug =
                  report.targetType === "POST" && report.target && "slug" in report.target
                    ? report.target.slug
                    : report.target && "post" in report.target
                      ? report.target.post.slug
                      : null;

                return (
                  <tr key={report.id} className="align-top hover:bg-zinc-50/80">
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-900">
                        {report.targetType === "POST" ? "글" : "댓글"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {formatReportTargetSummary(report.targetType, report.target)}
                      </p>
                      {postSlug && (
                        <Link
                          href={`/community/${postSlug}`}
                          className="mt-2 inline-block text-xs font-medium text-violet-700 hover:text-violet-900"
                        >
                          글 보기 →
                        </Link>
                      )}
                      {report.detail && (
                        <p className="mt-2 text-xs text-zinc-500">「{report.detail}」</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-zinc-700">{displayAuthorName(report.reporter)}</td>
                    <td className="px-5 py-4">{postReportReasonLabels[report.reason]}</td>
                    <td className="px-5 py-4">
                      <StatusBadge value={report.status} label={postReportStatusLabels[report.status]} />
                    </td>
                    <td className="px-5 py-4 text-zinc-600">{formatDateTime(report.createdAt)}</td>
                    <td className="px-5 py-4">
                      <ReportActions reportId={report.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
