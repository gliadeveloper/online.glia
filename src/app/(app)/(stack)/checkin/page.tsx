import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { CheckInHubFooterCta } from "@/components/checkin/check-in-hub-footer-cta";
import { CheckInHubPanel } from "@/components/checkin/check-in-hub-panel";
import { getCheckInHubData } from "@/lib/checkin-hub";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

function resolveHubFooterCta(data: Awaited<ReturnType<typeof getCheckInHubData>>) {
  const showDaily = Boolean(data.dailyForm && !data.todayDailyDone);
  const showWeekly = Boolean(data.weeklyTask?.writable);

  if (showDaily) {
    return {
      show: true,
      href: data.dailyTask.href,
      label: "오늘 체크 남기기",
    };
  }

  if (showWeekly && data.weeklyTask) {
    return {
      show: true,
      href: data.weeklyTask.href,
      label: "이번 주 주간 체크",
    };
  }

  return { show: false, href: "", label: "" };
}

export default async function CheckInHubPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/checkin");
  }

  const data = await getCheckInHubData(user.id);
  const footerCta = resolveHubFooterCta(data);

  return (
    <AppStackPage className="check-in-hub-page">
      <StackNavTitle title="체크인" />

      <article
        className={`check-in-hub-card${footerCta.show ? " check-in-hub-card--with-footer" : ""}`}
      >
        <div className="check-in-hub-card__blobs" aria-hidden="true">
          <div className="check-in-hub-card__blob check-in-hub-card__blob--indigo" />
          <div className="check-in-hub-card__blob check-in-hub-card__blob--violet" />
        </div>

        <div className="check-in-hub-card__content">
          <CheckInHubPanel data={data} />

          {footerCta.show ? (
            <CheckInHubFooterCta href={footerCta.href} label={footerCta.label} />
          ) : null}
        </div>
      </article>
    </AppStackPage>
  );
}
