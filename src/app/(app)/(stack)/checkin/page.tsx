import { redirect } from "next/navigation";

import { CheckInHubPanel } from "@/components/checkin/check-in-hub-panel";
import { CheckInSharePendingBanner } from "@/components/checkin/check-in-share-pending-banner";
import { Typography } from "@/components/typography/typography";
import { listPendingShareGrantsForUser } from "@/lib/checkin-share/grants";
import { getCheckInHubData } from "@/lib/checkin-hub";
import { getCurrentUser } from "@/lib/session";

export default async function CheckInHubPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/checkin");
  }

  const data = await getCheckInHubData(user.id);
  const pendingShareGrants = await listPendingShareGrantsForUser(user.id);

  const headlineRole =
    data.streakHeadline.kind === "continuing"
      ? "display"
      : data.streakHeadline.kind === "start"
        ? "pageTitle"
        : "pageTitle";

  const headlineWeight = data.streakHeadline.kind === "continuing" ? "bold" : "semibold";

  return (
    <div className="check-in-hub-page">
      <header className="check-in-streak-header">
        <Typography
          as="h1"
          role={headlineRole}
          weight={headlineWeight}
          color="primary"
          className="check-in-streak-header__title"
        >
          {data.streakTitle}
        </Typography>
        <Typography
          as="p"
          role="bodySecondary"
          color="secondary"
          className="check-in-streak-header__subtitle"
        >
          이번 주도 짧게 돌아보고 주간 체크를 남겨보세요
        </Typography>
      </header>

      <CheckInSharePendingBanner grants={pendingShareGrants} />

      <CheckInHubPanel data={data} />
    </div>
  );
}
