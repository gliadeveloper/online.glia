import Link from "next/link";

import { GrantEntitlementPanel } from "@/app/admin/coaching/entitlements/grant-entitlement-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminEntitlementsPage() {
  await requireAdmin();

  const [entitlements, users, offerings] = await Promise.all([
    prisma.coachingEntitlement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        coachingOffering: {
          select: { id: true, title: true, coach: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({ where: { role: "USER" }, select: { id: true, name: true, email: true } }),
    prisma.coachingOffering.findMany({ select: { id: true, title: true }, where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Coaching</p>
        <h1 className="text-3xl font-semibold tracking-tight">코칭권</h1>
      </div>

      <GrantEntitlementPanel
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        offerings={offerings.map((o) => ({ id: o.id, label: o.title }))}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">사용자</th>
              <th className="px-5 py-3 font-medium">상품</th>
              <th className="px-5 py-3 font-medium">회차</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">만료</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entitlements.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link href={`/admin/coaching/entitlements/${e.id}`} className="font-medium hover:text-violet-700">
                    {e.user.name ?? e.user.email}
                  </Link>
                </td>
                <td className="px-5 py-4">{e.coachingOffering.title}</td>
                <td className="px-5 py-4">
                  {e.completedSessions}/{e.totalSessions}
                </td>
                <td className="px-5 py-4"><StatusBadge value={e.status} /></td>
                <td className="px-5 py-4 text-zinc-500">{formatDateTime(e.validUntil)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
