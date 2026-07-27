import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, formatKrw, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      enrollments: {
        include: { course: { select: { id: true, title: true, slug: true } } },
        orderBy: { enrolledAt: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { lines: { include: { product: { select: { title: true } } } } },
      },
      coachingEntitlements: {
        include: { coachingOffering: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      },
      formSubmissions: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { form: { select: { title: true } } },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm font-medium text-violet-600">
        ← 사용자 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{user.name ?? user.email}</h1>
          <p className="text-zinc-500">{user.email}</p>
        </div>
        <StatusBadge value={user.role} />
      </div>

      <p className="text-sm text-zinc-500">가입 {formatDateTime(user.createdAt)}</p>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">수강 ({user.enrollments.length})</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {user.enrollments.map((e) => (
            <li key={e.id} className="flex justify-between px-5 py-4 text-sm">
              <span>{e.course.title}</span>
              <StatusBadge value={e.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">주문</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {user.orders.map((order) => (
            <li key={order.id} className="flex justify-between px-5 py-4 text-sm">
              <Link href={`/admin/orders/${order.id}`} className="hover:text-violet-700">
                {order.lines.map((l) => l.product.title).join(", ")}
              </Link>
              <span>{formatKrw(order.total)} · {order.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">코칭권</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {user.coachingEntitlements.map((e) => (
            <li key={e.id} className="flex justify-between px-5 py-4 text-sm">
              <Link href={`/admin/coaching/entitlements/${e.id}`} className="hover:text-violet-700">
                {e.coachingOffering.title}
              </Link>
              <StatusBadge value={e.status} />
            </li>
          ))}
        </ul>
      </section>

      {user.formSubmissions.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">최근 체크인</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {user.formSubmissions.map((s) => (
              <li key={s.id} className="flex justify-between px-5 py-4 text-sm">
                <span>{s.form.title}</span>
                <span className="text-zinc-500">{s.checkInDate}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
