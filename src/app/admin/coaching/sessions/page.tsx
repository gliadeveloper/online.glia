import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { coachingPublicationLabels } from "@/lib/customer-labels";
import { sessionInclude } from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

export default async function AdminCoachingSessionsPage() {
  await requireAdmin();

  const sessions = await prisma.coachingSession.findMany({
    orderBy: [{ scheduledAt: "asc" }, { sessionNo: "asc" }],
    take: 100,
    include: sessionInclude,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Coaching</p>
        <h1 className="text-3xl font-semibold tracking-tight">코칭 세션</h1>
        <p className="mt-1 text-zinc-600">회차별 콘텐츠 발행과 Q&A를 운영합니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">오픈 예정</th>
              <th className="px-5 py-3 font-medium">학생</th>
              <th className="px-5 py-3 font-medium">코치</th>
              <th className="px-5 py-3 font-medium">회차</th>
              <th className="px-5 py-3 font-medium">발행</th>
              <th className="px-5 py-3 font-medium">Q&A</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                  등록된 세션이 없습니다.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-zinc-50/80">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/coaching/sessions/${session.id}`}
                      className="font-medium text-zinc-900 hover:text-violet-700"
                    >
                      {formatDateTime(session.scheduledAt)}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    {session.user.name ?? session.user.email}
                  </td>
                  <td className="px-5 py-4">
                    {session.coach.name ?? session.coach.email}
                  </td>
                  <td className="px-5 py-4">
                    {session.sessionNo}회 · {session.title}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={coachingPublicationLabels[session.publicationStatus]} />
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {session.conversation?.messages.length ?? 0}건
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
