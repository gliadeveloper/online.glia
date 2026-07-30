import Link from "next/link";

import { CheckInHistoryList } from "@/components/checkin/check-in-history-list";
import { CheckInDayStrip } from "@/components/checkin/check-in-day-strip";
import { CheckInReportTasks } from "@/components/checkin/check-in-report-tasks";
import { Typography } from "@/components/typography/typography";
import { formatCheckInDayOfMonth } from "@/lib/checkin-dates";
import type { CheckInHubData } from "@/lib/checkin-hub";

type CheckInHubPanelProps = {
  data: CheckInHubData;
};

export function CheckInHubPanel({ data }: CheckInHubPanelProps) {
  if (!data.dailyForm) {
    return (
      <p className="check-in-hub__missing">
        <Typography as="span" role="bodySecondary" color="secondary">
          데일리 체크인 폼이 아직 준비되지 않았습니다.
        </Typography>
      </p>
    );
  }

  const historyItems = data.recentHistory.map((item) => ({
    id: item.id,
    href: item.href,
    title: item.title,
    subtitle: item.subtitle,
  }));

  const streakBadge = data.todayDailyDone && data.streak > 0 ? data.streak : formatCheckInDayOfMonth(data.today);

  return (
    <div className="check-in-hub__panel">
      <CheckInDayStrip days={data.dayStrip} labelId="check-in-day-strip-heading" />

      <CheckInReportTasks
        daily={{
          ...data.dailyTask,
          label: "데일리 체크 리스트 참여하기",
          badge: streakBadge,
        }}
        weekly={
          data.weeklyTask
            ? {
                ...data.weeklyTask,
                label: "주간 체크 리스트 참여하기",
                badge: streakBadge,
              }
            : null
        }
      />

      <section
        aria-labelledby="check-in-written-list-heading"
        className="check-in-section check-in-written-list"
      >
        <div className="check-in-section__header">
          <Typography
            as="h2"
            id="check-in-written-list-heading"
            role="sectionTitle"
            weight="semibold"
            color="primary"
            className="check-in-section__title"
          >
            작성한 목록
          </Typography>
          <Link href="/checkin/history" className="check-in-written-list__more shell-focus-ring">
            <Typography as="span" role="bodySecondary" weight="medium" color="secondary">
              더보기
            </Typography>
          </Link>
        </div>

        <CheckInHistoryList
          labelledBy="check-in-written-list-heading"
          items={historyItems}
          emptyMessage="아직 작성한 기록이 없습니다. 오늘 첫 체크를 시작해 보세요."
        />
      </section>
    </div>
  );
}
