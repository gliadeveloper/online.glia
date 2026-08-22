import { notFound, redirect } from "next/navigation";

import { CheckInFlowShell } from "@/components/checkin/check-in-flow-shell";
import { CheckInReport } from "@/components/checkin/check-in-report";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import { formatWeekRangeLabel } from "@/lib/checkin-dates";
import {
  getCheckInFormContext,
  isValidCheckInDateKey,
} from "@/lib/checkin-form-page";
import { buildCheckInReportItems } from "@/lib/checkin-report";
import { checkInFormPath, isCheckInSavedSearchParam } from "@/lib/checkin-routes";
import { getCurrentUser } from "@/lib/session";

type WeeklyCheckReportPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

export default async function WeeklyCheckReportPage({
  params,
  searchParams,
}: WeeklyCheckReportPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const { date } = await params;
    redirect(`/login?next=/checkin/weekly/report/${date}`);
  }

  const [{ date }, query] = await Promise.all([params, searchParams]);

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
        hideHeader
      >
        <p className="glia-ci-empty">주간 체크인 폼이 아직 준비되지 않았습니다.</p>
      </CheckInFlowShell>
    );
  }

  const { form, currentWeekKey, periodKey, submission, isFuture, isCurrentPeriod } = context;

  const periodLabel = isCurrentPeriod ? "이번 주" : formatWeekRangeLabel(periodKey);
  const navTitle = isCurrentPeriod ? "이번 주 체크" : `${periodLabel} 체크`;
  const showSavedNotice = isCheckInSavedSearchParam(query.saved);

  if (isFuture) {
    return (
      <CheckInFlowShell
        navTitle={navTitle}
        eyebrow="Weekly Check-in"
        title={periodLabel}
        titleAccent="체크"
        description={`${periodLabel} 주간 체크는 해당 주가 시작된 후에 열립니다.`}
        hideHeader
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

  if (!submission) {
    redirect(checkInFormPath("weekly", periodKey));
  }

  const items = buildCheckInReportItems(form.questions, submission.answers);

  return (
    <CheckInFlowShell
      navTitle={navTitle}
      eyebrow="Weekly Check-in"
      title={periodLabel}
      titleAccent="체크"
      description=""
      hideHeader
      contentClassName="check-in-flow__content check-in-flow__content--report"
    >
      <CheckInReport
        schedule="weekly"
        periodKey={periodKey}
        periodLabel={periodLabel}
        items={items}
        hubHref="/checkin"
        showSavedNotice={showSavedNotice}
      />
    </CheckInFlowShell>
  );
}
