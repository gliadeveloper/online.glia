import { redirect } from "next/navigation";

type LegacyWeeklyReportRedirectProps = {
  params: Promise<{ date: string }>;
};

/** Legacy URL: /checkin/weekly/[date]/report → /checkin/weekly/report/[date] */
export default async function LegacyWeeklyReportRedirect({ params }: LegacyWeeklyReportRedirectProps) {
  const { date } = await params;
  redirect(`/checkin/weekly/report/${date}`);
}
