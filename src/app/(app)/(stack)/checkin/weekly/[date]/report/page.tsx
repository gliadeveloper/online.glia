import { notFound, redirect } from "next/navigation";

import { CheckInReport } from "@/components/checkin/check-in-report";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import { Typography } from "@/components/typography/typography";
import { formatWeekRangeLabel } from "@/lib/checkin-dates";
import {
  getCheckInFormContext,
  isValidCheckInDateKey,
} from "@/lib/checkin-form-page";
import { buildCheckInReportItems } from "@/lib/checkin-report";
import { checkInFormPath } from "@/lib/checkin-routes";
import { getCurrentUser } from "@/lib/session";

type WeeklyCheckReportPageProps = {
  params: Promise<{ date: string }>;
};

export default async function WeeklyCheckReportPage({ params }: WeeklyCheckReportPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const { date } = await params;
    redirect(`/login?next=/checkin/weekly/${date}/report`);
  }

  const { date } = await params;

  if (!isValidCheckInDateKey(date)) {
    notFound();
  }

  const context = await getCheckInFormContext(user.id, "weekly-checkin", date);

  if (!context) {
    return (
      <p>
        <Typography as="span" role="bodySecondary" color="secondary">
          주간 체크인 폼이 아직 준비되지 않았습니다.
        </Typography>
      </p>
    );
  }

  const { form, currentWeekKey, periodKey, submission, isFuture, isCurrentPeriod } = context;

  if (isFuture) {
    return (
      <CheckInFutureEmpty
        title="아직 기록할 수 없는 주입니다"
        description={`${formatWeekRangeLabel(periodKey)} 주간 체크는 해당 주가 시작된 후에 열립니다.`}
        actionHref={`/checkin/weekly/${currentWeekKey}`}
        actionLabel="이번 주 기록하러 가기"
      />
    );
  }

  if (!submission) {
    redirect(checkInFormPath("weekly", periodKey));
  }

  const items = buildCheckInReportItems(form.questions, submission.answers);

  return (
    <CheckInReport
      schedule="weekly"
      periodKey={periodKey}
      periodLabel={
        isCurrentPeriod ? "이번 주" : formatWeekRangeLabel(periodKey)
      }
      items={items}
      hubHref="/checkin"
    />
  );
}
