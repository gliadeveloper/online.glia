import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ entityType?: string; action?: string }>;
};

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  await requireAdmin();
  const { entityType, action } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  const entityTypes = [
    "Product",
    "Course",
    "CoachingOffering",
    "CoachingSession",
    "Form",
    "FormSubmission",
    "Fulfillment",
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">System</p>
        <h1 className="text-3xl font-semibold tracking-tight">감사 로그</h1>
        <p className="mt-1 text-zinc-600">운영·CS 추적을 위한 변경 이력입니다.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/audit-logs"
          className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
            !entityType ? "bg-zinc-900 text-white" : "bg-white ring-1 ring-zinc-200 text-zinc-600"
          }`}
        >
          전체
        </Link>
        {entityTypes.map((type) => (
          <Link
            key={type}
            href={`/admin/audit-logs?entityType=${type}`}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              entityType === type
                ? "bg-zinc-900 text-white"
                : "bg-white ring-1 ring-zinc-200 text-zinc-600"
            }`}
          >
            {type}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">시간</th>
              <th className="px-5 py-3 font-medium">행위자</th>
              <th className="px-5 py-3 font-medium">액션</th>
              <th className="px-5 py-3 font-medium">엔티티</th>
              <th className="px-5 py-3 font-medium">메타</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {logs.map((log) => (
              <tr key={log.id} className="align-top hover:bg-zinc-50/80">
                <td className="px-5 py-4 text-zinc-500">{formatDateTime(log.createdAt)}</td>
                <td className="px-5 py-4">
                  {log.actor?.name ?? log.actor?.email ?? "시스템"}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge value="PUBLISHED" label={log.action} />
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium">{log.entityType}</p>
                  <p className="font-mono text-xs text-zinc-400">{log.entityId.slice(0, 12)}…</p>
                </td>
                <td className="px-5 py-4">
                  {log.metadata ? (
                    <pre className="max-w-xs overflow-x-auto rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
