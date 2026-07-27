import Link from "next/link";

import { CheckInForm } from "@/app/(customer)/checkin/check-in-form";
import {
  formDetailInclude,
  getCheckInDate,
  getWeekPeriodKey,
  listFormSubmissionHistory,
  resolvePeriodKey,
} from "@/lib/forms";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type CheckInPageProps = {
  searchParams: Promise<{ tab?: string; date?: string }>;
};

export default async function CheckInPage({ searchParams }: CheckInPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { tab = "daily", date } = await searchParams;

  const [dailyForm, weeklyForm] = await Promise.all([
    prisma.form.findFirst({
      where: { slug: "daily-checkin", status: "PUBLISHED" },
      include: formDetailInclude,
    }),
    prisma.form.findFirst({
      where: { slug: "weekly-checkin", status: "PUBLISHED" },
      include: formDetailInclude,
    }),
  ]);

  if (!dailyForm && !weeklyForm) {
    return (
      <p className="text-sm text-zinc-500">
        체크인 폼이 없습니다.{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5">npm run db:seed</code>
      </p>
    );
  }

  const timezone = dailyForm?.timezone ?? weeklyForm?.timezone ?? "Asia/Seoul";
  const today = getCheckInDate(timezone);
  const activeTab = tab === "weekly" ? "weekly" : "daily";
  const activeForm = activeTab === "weekly" ? weeklyForm : dailyForm;

  if (!activeForm) {
    return <p className="text-sm text-zinc-500">해당 체크인 폼을 찾을 수 없습니다.</p>;
  }

  const selectedDate = date ?? today;
  const periodKey = resolvePeriodKey(activeForm, new Date(`${selectedDate}T12:00:00`));
  const currentWeekKey = getWeekPeriodKey(timezone);

  const [submission, history] = await Promise.all([
    prisma.formSubmission.findUnique({
      where: {
        formId_userId_checkInDate: {
          formId: activeForm.id,
          userId: user.id,
          checkInDate: periodKey,
        },
      },
      include: {
        answers: {
          include: {
            question: { select: { id: true, prompt: true, order: true } },
            option: { select: { id: true, label: true, emoji: true } },
          },
        },
      },
    }),
    listFormSubmissionHistory({
      formId: activeForm.id,
      userId: user.id,
      limit: 14,
    }),
  ]);

  const periodLabel =
    activeTab === "weekly"
      ? `주간 (${periodKey} 주)`
      : selectedDate;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-violet-600">Check-in</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {activeTab === "weekly" ? "주간 체크인" : "오늘의 체크인"}
        </h1>
        <p className="text-sm text-zinc-500">
          날짜와 관계없이 언제든 조회하고 수정할 수 있습니다.
        </p>
      </header>

      <div className="flex gap-2">
        <Link
          href={`/checkin?tab=daily&date=${selectedDate}`}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            activeTab === "daily"
              ? "bg-violet-600 text-white"
              : "bg-white text-zinc-600 ring-1 ring-zinc-200"
          }`}
        >
          데일리
        </Link>
        <Link
          href={`/checkin?tab=weekly&date=${selectedDate}`}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            activeTab === "weekly"
              ? "bg-violet-600 text-white"
              : "bg-white text-zinc-600 ring-1 ring-zinc-200"
          }`}
        >
          주간 (일요일)
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <label htmlFor="checkin-date" className="text-sm font-medium text-zinc-700">
          {activeTab === "weekly" ? "기준 날짜 (해당 주 일요일로 저장)" : "날짜 선택"}
        </label>
        <form method="get" className="mt-2 flex gap-2">
          <input type="hidden" name="tab" value={activeTab} />
          <input
            id="checkin-date"
            name="date"
            type="date"
            defaultValue={selectedDate}
            max={today}
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800"
          >
            조회
          </button>
        </form>
        {activeTab === "weekly" && (
          <p className="mt-2 text-xs text-zinc-500">
            저장 주차: {periodKey}
            {periodKey === currentWeekKey ? " (이번 주)" : ""}
          </p>
        )}
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium text-zinc-700">기록 목록</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {history.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/checkin?tab=${activeTab}&date=${item.checkInDate}`}
                  className={`inline-block rounded-lg px-3 py-1.5 text-xs font-medium ${
                    item.checkInDate === periodKey
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {item.checkInDate}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-medium">{activeForm.title}</h2>
          <span className="text-xs text-zinc-400">{periodLabel}</span>
        </div>

        {submission && (
          <p className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {selectedDate === today || periodKey === currentWeekKey
              ? "기존 기록을 불러왔습니다. 수정 후 저장하면 업데이트됩니다."
              : "과거 기록입니다. 수정 후 저장할 수 있습니다."}
          </p>
        )}

        <CheckInForm
          key={`${activeForm.slug}-${periodKey}`}
          formSlug={activeForm.slug}
          questions={activeForm.questions}
          periodDate={selectedDate}
          initialAnswers={submission?.answers.map((answer) => ({
            questionId: answer.questionId,
            optionId: answer.optionId,
            textValue: answer.textValue,
          }))}
          submitLabel={submission ? "수정 저장" : "체크인 저장"}
        />
      </div>
    </div>
  );
}
