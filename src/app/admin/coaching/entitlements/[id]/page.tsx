import Link from "next/link";
import { notFound } from "next/navigation";

import { EntitlementActions } from "@/app/admin/coaching/entitlements/[id]/entitlement-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { coachingPublicationLabels } from "@/lib/customer-labels";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEntitlementDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const entitlement = await prisma.coachingEntitlement.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      coachingOffering: {
        select: { id: true, title: true, slug: true, coach: { select: { name: true, email: true } } },
      },
      sessions: { orderBy: { scheduledAt: "desc" } },
    },
  });

  if (!entitlement) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/coaching/entitlements" className="text-sm font-medium text-violet-600">
        ← 코칭권 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {entitlement.user.name ?? entitlement.user.email}
          </h1>
          <p className="text-zinc-600">{entitlement.coachingOffering.title}</p>
        </div>
        <StatusBadge value={entitlement.status} />
      </div>

      <EntitlementActions entitlementId={entitlement.id} status={entitlement.status} />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "완료", value: String(entitlement.completedSessions) },
          { label: "총 회차", value: String(entitlement.totalSessions) },
          { label: "만료", value: formatDateTime(entitlement.validUntil) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">세션 기록</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {entitlement.sessions.map((session) => (
            <li key={session.id} className="flex justify-between px-5 py-4 text-sm">
              <Link href={`/admin/coaching/sessions/${session.id}`} className="font-medium hover:text-violet-700">
                {session.sessionNo}회 · {formatDateTime(session.scheduledAt)}
              </Link>
              <StatusBadge value={coachingPublicationLabels[session.publicationStatus]} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
