import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          orders: true,
          formSubmissions: true,
          coachingEntitlements: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Users</p>
        <h1 className="text-3xl font-semibold tracking-tight">사용자</h1>
        <p className="mt-1 text-zinc-600">역할별 계정과 활동 요약을 확인합니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">사용자</th>
              <th className="px-5 py-3 font-medium">역할</th>
              <th className="px-5 py-3 font-medium">수강</th>
              <th className="px-5 py-3 font-medium">주문</th>
              <th className="px-5 py-3 font-medium">체크인</th>
              <th className="px-5 py-3 font-medium">코칭권</th>
              <th className="px-5 py-3 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-zinc-900 hover:text-violet-700">
                    {user.name ?? "—"}
                  </Link>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge value={user.role} />
                </td>
                <td className="px-5 py-4">{user._count.enrollments}</td>
                <td className="px-5 py-4">{user._count.orders}</td>
                <td className="px-5 py-4">{user._count.formSubmissions}</td>
                <td className="px-5 py-4">{user._count.coachingEntitlements}</td>
                <td className="px-5 py-4 text-zinc-500">{formatDateTime(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
