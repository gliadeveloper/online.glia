import { notFound, redirect } from "next/navigation";

import { CheckInForm } from "@/components/checkin/check-in-form";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import { Typography } from "@/components/typography/typography";
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
      <p>
        <Typography as="span" role="bodySecondary" color="secondary">
          데일리 체크인 폼이 아직 준비되지 않았습니다.
        </Typography>
      </p>
    );
  }

  const { form, today, selectedDate, periodKey, submission, isFuture } = context;

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

  if (submission && !isRedo) {
    redirect(checkInReportPath("daily", periodKey));
  }

  return (
    <div className="check-in-form-page check-in-form-page--step">
      <CheckInForm
        key={`${form.slug}-${periodKey}-${isRedo ? "redo" : "new"}`}
        formSlug={form.slug}
        questions={form.questions}
        periodDate={selectedDate}
        reportHref={checkInReportPath("daily", periodKey)}
        submitLabel={isRedo ? "다시 저장" : "체크인 저장"}
      />
    </div>
  );
}
