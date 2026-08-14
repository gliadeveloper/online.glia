import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, purposeLabels, requireAdmin } from "@/lib/admin";
import { getCheckInFormsSetupStatus } from "@/lib/checkin-admin-setup";
import { prisma } from "@/lib/prisma";

type AdminCheckinsPageProps = {
  searchParams: Promise<{ purpose?: string }>;
};

export default async function AdminCheckinsPage({ searchParams }: AdminCheckinsPageProps) {
  await requireAdmin();
  const { purpose } = await searchParams;
  const formSetup = await getCheckInFormsSetupStatus();
  const missingForms = formSetup.filter((item) => !item.isReady);

  const purposeFilter =
    purpose === "DAILY_CHECKIN" || purpose === "WEEKLY_CHECKIN"
      ? purpose
      : undefined;

  const submissions = await prisma.formSubmission.findMany({
    where: {
      form: {
        purpose: purposeFilter ?? { in: ["DAILY_CHECKIN", "WEEKLY_CHECKIN"] },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      form: { select: { slug: true, title: true, purpose: true } },
      answers: {
        include: {
          question: { select: { prompt: true, order: true } },
          option: { select: { label: true, emoji: true } },
        },
      },
    },
  });

  const tabs = [
    { href: "/admin/checkins", label: "전체", purpose: undefined },
    { href: "/admin/checkins?purpose=DAILY_CHECKIN", label: "데일리", purpose: "DAILY_CHECKIN" },
    { href: "/admin/checkins?purpose=WEEKLY_CHECKIN", label: "주간", purpose: "WEEKLY_CHECKIN" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Check-ins</p>
          <h1 className="text-3xl font-semibold tracking-tight">체크인 기록</h1>
          <p className="mt-1 text-zinc-600">고객 제출 내역을 날짜·유형별로 확인합니다.</p>
        </div>
        <Link
          href="/admin/checkins/forms"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm"
        >
          체크인 폼 등록
        </Link>
      </div>

      {missingForms.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-medium">
            {missingForms.map((item) => item.title).join(", ")} 폼이 아직 준비되지 않았습니다.
          </p>
          <p className="mt-1">
            고객 화면에서 체크인하려면 발행된 폼이 필요합니다.{" "}
            <Link href="/admin/checkins/forms" className="font-medium text-amber-950 underline">
              체크인 폼 등록
            </Link>
            에서 기본 템플릿을 등록하세요.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab.purpose === purposeFilter || (!purposeFilter && !tab.purpose)
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
            표시할 체크인 기록이 없습니다.
          </div>
        ) : (
          submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">
                    {submission.user.name ?? submission.user.email}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">{submission.user.email}</p>
                </div>
                <div className="text-right">
                  <StatusBadge
                    value={submission.form.purpose}
                    label={purposeLabels[submission.form.purpose]}
                  />
                  <p className="mt-2 text-sm font-medium">{submission.checkInDate}</p>
                  <p className="text-xs text-zinc-400">{formatDateTime(submission.updatedAt)}</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-600">{submission.form.title}</p>

              <dl className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {submission.answers
                  .sort((a, b) => a.question.order - b.question.order)
                  .map((answer) => (
                    <div key={answer.id} className="rounded-xl bg-zinc-50 px-3 py-2">
                      <dt className="text-xs text-zinc-500">{answer.question.prompt}</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900">
                        {answer.textValue ??
                          (answer.option?.emoji
                            ? `${answer.option.emoji} ${answer.option.label}`
                            : answer.option?.label) ??
                          "—"}
                      </dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
