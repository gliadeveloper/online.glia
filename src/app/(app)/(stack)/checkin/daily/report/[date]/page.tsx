import { notFound, redirect } from "next/navigation";

import { CheckInFlowShell } from "@/components/checkin/check-in-flow-shell";
import { CheckInReport } from "@/components/checkin/check-in-report";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import {
  formatCheckInPageDate,
  getCheckInFormContext,
  isValidCheckInDateKey,
} from "@/lib/checkin-form-page";
import { buildCheckInReportItems } from "@/lib/checkin-report";
import { checkInFormPath, isCheckInSavedSearchParam } from "@/lib/checkin-routes";
import { getCurrentUser } from "@/lib/session";

type DailyCheckReportPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

export default async function DailyCheckReportPage({
  params,
  searchParams,
}: DailyCheckReportPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const { date } = await params;
    redirect(`/login?next=/checkin/daily/report/${date}`);
  }

  const [{ date }, query] = await Promise.all([params, searchParams]);

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
        hideHeader
      >
        <p className="check-in-hub__missing">데일리 체크인 폼이 아직 준비되지 않았습니다.</p>
      </CheckInFlowShell>
    );
  }

  const { form, today, selectedDate, periodKey, submission, isFuture, isCurrentPeriod } =
    context;

  const periodLabel = isCurrentPeriod ? "오늘" : formatCheckInPageDate(selectedDate);
  const navTitle = isCurrentPeriod ? "오늘 체크" : `${periodLabel} 체크`;
  const showSavedNotice = isCheckInSavedSearchParam(query.saved);

  if (isFuture) {
    return (
      <CheckInFlowShell
        navTitle={navTitle}
        eyebrow="Daily Check-in"
        title={periodLabel}
        titleAccent="체크"
        description={`${periodLabel} 체크는 해당 날짜가 되면 열립니다.`}
        hideHeader
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

  if (!submission) {
    redirect(checkInFormPath("daily", selectedDate));
  }

  const items = buildCheckInReportItems(form.questions, submission.answers);

  return (
    <CheckInFlowShell
      navTitle={navTitle}
      eyebrow="Daily Check-in"
      title={periodLabel}
      titleAccent="체크"
      description=""
      hideHeader
      contentClassName="check-in-flow__content check-in-flow__content--report"
    >
      <CheckInReport
        schedule="daily"
        periodKey={periodKey}
        periodLabel={periodLabel}
        items={items}
        hubHref="/checkin"
        showSavedNotice={showSavedNotice}
      />
    </CheckInFlowShell>
  );
}
