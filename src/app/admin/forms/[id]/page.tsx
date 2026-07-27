import Link from "next/link";
import { notFound } from "next/navigation";

import { FormActions } from "@/app/admin/forms/[id]/form-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatDateTime,
  purposeLabels,
  requireAdmin,
  scheduleLabels,
  statusLabels,
} from "@/lib/admin";
import { formDetailInclude } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

type AdminFormDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminFormDetailPage({ params }: AdminFormDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      ...formDetailInclude,
      createdBy: { select: { name: true, email: true } },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) {
    notFound();
  }

  const submissions = await prisma.formSubmission.findMany({
    where: { formId: id },
    orderBy: { checkInDate: "desc" },
    take: 20,
    include: {
      user: { select: { id: true, name: true, email: true } },
      answers: {
        include: {
          question: { select: { prompt: true, order: true } },
          option: { select: { label: true, emoji: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/forms" className="text-sm font-medium text-violet-600">
          ← 폼 목록
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{form.title}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-500">{form.slug}</p>
            {form.description && (
              <p className="mt-2 text-zinc-600">{form.description}</p>
            )}
          </div>
          <FormActions formId={form.id} status={form.status} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "상태", value: <StatusBadge value={form.status} label={statusLabels[form.status]} /> },
          { label: "목적", value: <StatusBadge value={form.purpose} label={purposeLabels[form.purpose]} /> },
          { label: "주기", value: scheduleLabels[form.schedule] },
          { label: "제출 수", value: String(form._count.submissions) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {item.label}
            </p>
            <div className="mt-2 text-sm font-medium text-zinc-900">{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">질문 구성</h2>
          <p className="mt-1 text-sm text-zinc-500">
            생성자 {form.createdBy.name ?? form.createdBy.email}
          </p>
        </div>
        <ol className="divide-y divide-zinc-100">
          {form.questions.map((question) => (
            <li key={question.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{question.prompt}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {question.type} · {question.isRequired ? "필수" : "선택"}
                  </p>
                </div>
              </div>
              {question.options.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <span
                      key={option.id}
                      className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700"
                    >
                      {option.emoji ? `${option.emoji} ` : ""}
                      {option.label}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">최근 제출</h2>
        </div>
        {submissions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">제출 기록이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {submissions.map((submission) => (
              <li key={submission.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {submission.user.name ?? submission.user.email}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {submission.checkInDate} · {formatDateTime(submission.updatedAt)}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {submission.answers
                    .sort((a, b) => a.question.order - b.question.order)
                    .map((answer) => (
                      <div
                        key={answer.id}
                        className="rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                      >
                        <dt className="text-xs text-zinc-500">{answer.question.prompt}</dt>
                        <dd className="mt-1 font-medium text-zinc-900">
                          {answer.textValue ??
                            (answer.option?.emoji
                              ? `${answer.option.emoji} ${answer.option.label}`
                              : answer.option?.label) ??
                            "—"}
                        </dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
