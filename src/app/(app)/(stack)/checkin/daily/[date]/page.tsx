import { notFound, redirect } from "next/navigation";

import { CheckInFlowShell } from "@/components/checkin/check-in-flow-shell";
import { CheckInForm } from "@/components/checkin/check-in-form";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import {
  formatCheckInPageDate,
  getCheckInFormContext,
  isValidCheckInDateKey,
} from "@/lib/checkin-form-page";
import {
  checkInReportPath,
  isCheckInRedoSearchParam,
} from "@/lib/checkin-routes";
import { getCurrentUser } from "@/lib/session";

type DailyCheckFormPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ redo?: string | string[] }>;
};

export default async function DailyCheckFormPage({
  params,
  searchParams,
}: DailyCheckFormPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const { date } = await params;
    redirect(`/login?next=/checkin/daily/${date}`);
  }

  const [{ date }, query] = await Promise.all([params, searchParams]);
  const isRedo = isCheckInRedoSearchParam(query.redo);

  if (!isValidCheckInDateKey(date)) {
    notFound();
  }

  const context = await getCheckInFormContext(user.id, "daily-checkin", date);

  if (!context) {
    return (
      <CheckInFlowShell
        navTitle="데일리 체크"
        eyebrow="Daily Check-in"
        title="데일리"
        titleAccent="체크"
        description="데일리 체크인 폼이 아직 준비되지 않았습니다."
      >
        <p className="glia-ci-empty">데일리 체크인 폼이 아직 준비되지 않았습니다.</p>
      </CheckInFlowShell>
    );
  }

  const { form, today, selectedDate, periodKey, submission, isFuture, isCurrentPeriod } =
    context;

  const periodTitle = isCurrentPeriod ? "오늘" : formatCheckInPageDate(selectedDate);
  const shellProps = {
    navTitle: "데일리 체크",
    eyebrow: "Daily Check-in",
    title: periodTitle,
    titleAccent: "체크",
    description: "짧게 돌아보고 오늘의 체크를 남겨보세요.",
  };

  if (isFuture) {
    return (
      <CheckInFlowShell
        {...shellProps}
        contentClassName="check-in-flow__content check-in-flow__content--state"
      >
        <CheckInFutureEmpty
          title="아직 기록할 수 없는 날짜입니다"
          description={`${formatCheckInPageDate(selectedDate)} 체크는 해당 날짜가 되면 열립니다.`}
          actionHref={`/checkin/daily/${today}`}
          actionLabel="오늘 기록하러 가기"
        />
      </CheckInFlowShell>
    );
  }

  if (submission && !isRedo) {
    redirect(checkInReportPath("daily", selectedDate));
  }

  return (
    <CheckInFlowShell
      {...shellProps}
      hideHeader
      variant="hub"
      contentClassName="check-in-flow__content check-in-flow__content--form"
    >
      <CheckInForm
        key={`${form.slug}-${periodKey}-${isRedo ? "redo" : "new"}`}
        formSlug={form.slug}
        questions={form.questions}
        periodDate={selectedDate}
        initialAnswers={submission?.answers.map((answer) => ({
          questionId: answer.questionId,
          optionId: answer.optionId,
          textValue: answer.textValue,
        }))}
        reportHref={checkInReportPath("daily", selectedDate)}
        submitLabel={isRedo ? "다시 저장" : "체크인 저장"}
        eyebrow="Daily Check-in"
        heading={`${periodTitle} 체크`}
        lede={shellProps.description}
      />
    </CheckInFlowShell>
  );
}
