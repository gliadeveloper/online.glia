import { notFound, redirect } from "next/navigation";

import { CheckInForm } from "@/components/checkin/check-in-form";
import { CheckInFutureEmpty } from "@/components/checkin/check-in-future-empty";
import { Typography } from "@/components/typography/typography";
import { formatWeekRangeLabel } from "@/lib/checkin-dates";
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
      <p>
        <Typography as="span" role="bodySecondary" color="secondary">
          주간 체크인 폼이 아직 준비되지 않았습니다.
        </Typography>
      </p>
    );
  }

  const { form, currentWeekKey, periodKey, submission, isFuture } = context;

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

  if (submission && !isRedo) {
    redirect(checkInReportPath("weekly", periodKey));
  }

  return (
    <div className="check-in-form-page check-in-form-page--step">
      <CheckInForm
        key={`${form.slug}-${periodKey}-${isRedo ? "redo" : "new"}`}
        formSlug={form.slug}
        questions={form.questions}
        periodDate={date}
        reportHref={checkInReportPath("weekly", periodKey)}
        submitLabel={isRedo ? "다시 저장" : "주간 체크 저장"}
      />
    </div>
  );
}
