import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { coachingOfferingInclude } from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

export default async function AdminCoachingOfferingsPage() {
  await requireAdmin();

  const offerings = await prisma.coachingOffering.findMany({
    orderBy: { updatedAt: "desc" },
    include: coachingOfferingInclude,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Coaching</p>
          <h1 className="text-3xl font-semibold tracking-tight">코칭 상품</h1>
          <p className="mt-1 text-zinc-600">코칭 회차권 SKU와 코치 배정을 관리합니다.</p>
        </div>
        <Link
          href="/admin/coaching-offerings/new"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          새 코칭 상품
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">상품</th>
              <th className="px-5 py-3 font-medium">코치</th>
              <th className="px-5 py-3 font-medium">회차</th>
              <th className="px-5 py-3 font-medium">유효기간</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">권한</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {offerings.map((offering) => (
              <tr key={offering.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/coaching-offerings/${offering.id}`}
                    className="font-medium text-zinc-900 hover:text-violet-700"
                  >
                    {offering.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{offering.totalSessions}회 · {offering.validDays}일</p>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {offering.coach?.name ?? offering.coach?.email ?? "—"}
                </td>
                <td className="px-5 py-4">{offering.totalSessions}회</td>
                <td className="px-5 py-4">{offering.validDays}일</td>
                <td className="px-5 py-4">
                  <StatusBadge
                    value={offering.isActive ? "PUBLISHED" : "ARCHIVED"}
                    label={offering.isActive ? "활성" : "비활성"}
                  />
                </td>
                <td className="px-5 py-4">{offering._count.entitlements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
