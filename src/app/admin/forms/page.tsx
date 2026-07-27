import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import {
  purposeLabels,
  requireAdmin,
  scheduleLabels,
  statusLabels,
} from "@/lib/admin";
import { formDetailInclude } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export default async function AdminFormsPage() {
  await requireAdmin();

  const forms = await prisma.form.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      ...formDetailInclude,
      createdBy: { select: { name: true, email: true } },
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Forms</p>
          <h1 className="text-3xl font-semibold tracking-tight">폼 관리</h1>
          <p className="mt-1 text-zinc-600">체크인·설문 폼을 생성하고 발행 상태를 관리합니다.</p>
        </div>
        <Link
          href="/admin/forms/new"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          새 폼 만들기
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">제목</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">목적</th>
              <th className="px-5 py-3 font-medium">주기</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">제출</th>
              <th className="px-5 py-3 font-medium">질문</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {forms.map((form) => (
              <tr key={form.id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/forms/${form.id}`}
                    className="font-medium text-zinc-900 hover:text-violet-700"
                  >
                    {form.title}
                  </Link>
                  {form.description && (
                    <p className="mt-0.5 text-xs text-zinc-500">{form.description}</p>
                  )}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-zinc-500">{form.slug}</td>
                <td className="px-5 py-4">
                  <StatusBadge value={form.purpose} label={purposeLabels[form.purpose]} />
                </td>
                <td className="px-5 py-4 text-zinc-600">{scheduleLabels[form.schedule]}</td>
                <td className="px-5 py-4">
                  <StatusBadge value={form.status} label={statusLabels[form.status]} />
                </td>
                <td className="px-5 py-4 font-medium">{form._count.submissions}</td>
                <td className="px-5 py-4 text-zinc-600">{form.questions.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
