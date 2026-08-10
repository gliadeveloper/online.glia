import { redirect } from "next/navigation";

type LegacyDailyReportRedirectProps = {
  params: Promise<{ date: string }>;
};

/** Legacy URL: /checkin/daily/[date]/report → /checkin/daily/report/[date] */
export default async function LegacyDailyReportRedirect({ params }: LegacyDailyReportRedirectProps) {
  const { date } = await params;
  redirect(`/checkin/daily/report/${date}`);
}
