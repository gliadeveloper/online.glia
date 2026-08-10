import { notFound, redirect } from "next/navigation";

import { CheckInFlowShell } from "@/components/checkin/check-in-flow-shell";
import { CheckInForm } from "@/components/checkin/check-in-form";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import { formatWeekRangeLabel, isWeeklyCheckInWritableDay } from "@/lib/checkin-dates";
import {
  getCheckInFormContext,
  isValidCheckInDateKey,
} from "@/lib/checkin-form-page";
import {
  checkInReportPath,
  isCheckInRedoSearchParam,
} from "@/lib/checkin-routes";
import { getCurrentUser } from "@/lib/session";

type WeeklyCheckFormPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ redo?: string | string[] }>;
};

export default async function WeeklyCheckFormPage({
  params,
  searchParams,
}: WeeklyCheckFormPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const { date } = await params;
    redirect(`/login?next=/checkin/weekly/${date}`);
  }

  const [{ date }, query] = await Promise.all([params, searchParams]);
  const isRedo = isCheckInRedoSearchParam(query.redo);

  if (!isValidCheckInDateKey(date)) {
    notFound();
  }

  const context = await getCheckInFormContext(user.id, "weekly-checkin", date);

  if (!context) {
    return (
      <CheckInFlowShell
        navTitle="주간 체크"
        eyebrow="Weekly Check-in"
        title="주간"
        titleAccent="체크"
        description="주간 체크인 폼이 아직 준비되지 않았습니다."
      >
        <p className="check-in-hub__missing">주간 체크인 폼이 아직 준비되지 않았습니다.</p>
      </CheckInFlowShell>
    );
  }

  const { form, today, currentWeekKey, periodKey, submission, isFuture, isCurrentPeriod } = context;

  const periodTitle = isCurrentPeriod ? "이번 주" : formatWeekRangeLabel(periodKey);
  const shellProps = {
    navTitle: "주간 체크",
    eyebrow: "Weekly Check-in",
    title: periodTitle,
    titleAccent: "체크",
    description: "한 주를 돌아보며 주간 체크를 남겨보세요.",
  };

  const isWritableToday = isWeeklyCheckInWritableDay(today, form.timezone);

  if (isFuture) {
    return (
      <CheckInFlowShell
        {...shellProps}
        contentClassName="check-in-flow__content check-in-flow__content--state"
      >
        <CheckInFutureEmpty
          title="아직 기록할 수 없는 주입니다"
          description={`${formatWeekRangeLabel(periodKey)} 주간 체크는 해당 주가 시작된 후에 열립니다.`}
          actionHref={`/checkin/weekly/${currentWeekKey}`}
          actionLabel="이번 주 기록하러 가기"
        />
      </CheckInFlowShell>
    );
  }

  if (isCurrentPeriod && !submission && !isRedo && !isWritableToday) {
    return (
      <CheckInFlowShell
        {...shellProps}
        hideHeader
        contentClassName="check-in-flow__content check-in-flow__content--state"
      >
        <CheckInFutureEmpty
          title="일요일에 열립니다"
          description="주간 체크는 매주 일요일에 작성할 수 있습니다. 일요일에 다시 방문해 주세요."
          actionHref="/checkin"
          actionLabel="체크인 목록"
        />
      </CheckInFlowShell>
    );
  }

  if (submission && !isRedo) {
    redirect(checkInReportPath("weekly", periodKey));
  }

  return (
    <CheckInFlowShell
      {...shellProps}
      contentClassName="check-in-flow__content check-in-flow__content--form"
    >
      <CheckInForm
        key={`${form.slug}-${periodKey}-${isRedo ? "redo" : "new"}`}
        formSlug={form.slug}
        questions={form.questions}
        periodDate={date}
        reportHref={checkInReportPath("weekly", periodKey)}
        submitLabel={isRedo ? "다시 저장" : "주간 체크 저장"}
      />
    </CheckInFlowShell>
  );
}
