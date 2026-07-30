import { notFound, redirect } from "next/navigation";

import { CheckInReport } from "@/components/checkin/check-in-report";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import { Typography } from "@/components/typography/typography";
import {
  formatCheckInPageDate,
  getCheckInFormContext,
  isValidCheckInDateKey,
} from "@/lib/checkin-form-page";
import { buildCheckInReportItems } from "@/lib/checkin-report";
import { checkInFormPath } from "@/lib/checkin-routes";
import { getCurrentUser } from "@/lib/session";

type DailyCheckReportPageProps = {
  params: Promise<{ date: string }>;
};

export default async function DailyCheckReportPage({ params }: DailyCheckReportPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const { date } = await params;
    redirect(`/login?next=/checkin/daily/${date}/report`);
  }

  const { date } = await params;

  if (!isValidCheckInDateKey(date)) {
    notFound();
  }

  const context = await getCheckInFormContext(user.id, "daily-checkin", date);

  if (!context) {
    return (
      <p>
        <Typography as="span" role="bodySecondary" color="secondary">
          데일리 체크인 폼이 아직 준비되지 않았습니다.
        </Typography>
      </p>
    );
  }

  const { form, today, selectedDate, periodKey, submission, isFuture, isCurrentPeriod } = context;

  if (isFuture) {
    return (
      <CheckInFutureEmpty
        title="아직 기록할 수 없는 날짜입니다"
        description={`${formatCheckInPageDate(selectedDate)} 체크는 해당 날짜가 되면 열립니다.`}
        actionHref={`/checkin/daily/${today}`}
        actionLabel="오늘 기록하러 가기"
      />
    );
  }

  if (!submission) {
    redirect(checkInFormPath("daily", periodKey));
  }

  const items = buildCheckInReportItems(form.questions, submission.answers);

  return (
    <CheckInReport
      schedule="daily"
      periodKey={periodKey}
      periodLabel={isCurrentPeriod ? "오늘" : formatCheckInPageDate(selectedDate)}
      items={items}
      hubHref="/checkin"
    />
  );
}
