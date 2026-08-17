import Link from "next/link";

import { CheckInDayStrip } from "@/components/checkin/check-in-day-strip";
import { CheckInHistoryList } from "@/components/checkin/check-in-history-list";
import { CheckInHubStripTitle } from "@/components/checkin/check-in-hub-strip-title";
import { CheckInStatusPill } from "@/components/checkin/check-in-status-pill";
import { Typography } from "@/components/typography/typography";
import type { CheckInHubData } from "@/lib/checkin-hub";
type CheckInHubPanelProps = {
  data: CheckInHubData;
};

function ChevronIcon() {
  return (
    <span className="check-in-hub-row__chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function CheckInWeeklyTaskRow({ task }: { task: NonNullable<CheckInHubData["weeklyTask"]> }) {
  const isLocked = !task.done && !task.writable;

  if (isLocked) {
    return (
      <div className="check-in-hub-row check-in-hub-row--locked" aria-disabled="true">
        <span className="check-in-hub-row__body">
          <span className="check-in-hub-row__title">{task.label}</span>
          <span className="check-in-hub-row__subtitle">이번 주</span>
        </span>
        <span className="check-in-hub-row__lock-hint">{task.lockedHint}</span>
      </div>
    );
  }

  return (
    <Link href={task.href} className="check-in-hub-row shell-focus-ring">
      <span className="check-in-hub-row__body">
        <span className="check-in-hub-row__title">{task.label}</span>
        <span className="check-in-hub-row__subtitle">이번 주</span>
      </span>
      <CheckInStatusPill
        done={task.done}
        pendingLabel="작성 필요"
        doneLabel="완료"
      />
      <ChevronIcon />
      <span className="sr-only">
        {task.label} — {task.done ? "완료된 기록 보기" : "작성하기"}
      </span>
    </Link>
  );
}

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
    kind: item.kind,
    subtitle: item.subtitle,
  }));

  return (
    <div className="check-in-hub__panel">
      <CheckInDayStrip
        days={data.dayStrip}
        title={
          <CheckInHubStripTitle todayDailyDone={data.todayDailyDone} streak={data.streak} />
        }
      />

      {data.weeklyTask ? (
        <section aria-labelledby="check-in-weekly-heading" className="check-in-hub-section check-in-hub-weekly">
          <div className="check-in-hub-section__head check-in-hub-weekly__head">
            <h2 id="check-in-weekly-heading" className="check-in-hub-section__title">
              이번 주 주간 체크
            </h2>
          </div>
          <CheckInWeeklyTaskRow task={data.weeklyTask} />
        </section>
      ) : null}

      <section aria-labelledby="check-in-coach-access-heading" className="check-in-hub-section check-in-hub-access">
        <div className="check-in-hub-section__head">
          <div>
            <h2 id="check-in-coach-access-heading" className="check-in-hub-section__title">코치 공유</h2>
            <p className="check-in-hub-section__meta">내 기록을 볼 코치를 직접 관리할 수 있어요.</p>
          </div>
        </div>
        <Link href="/checkin/sharing" className="check-in-hub-access__link corp-trust-focus shell-focus-ring">
          코치 접근 권한 관리 <ChevronIcon />
        </Link>
      </section>

      <section aria-labelledby="check-in-written-list-heading" className="check-in-hub-section check-in-written-list">
        <div className="check-in-hub-section__head">
          <h2 id="check-in-written-list-heading" className="check-in-hub-section__title">
            작성한 목록
          </h2>
          <Link href="/checkin/history" className="check-in-written-list__more corp-trust-focus shell-focus-ring">
            더보기
          </Link>
        </div>

        <div className="check-in-written-list__surface">
          <CheckInHistoryList
            labelledBy="check-in-written-list-heading"
            items={historyItems}
            emptyMessage="아직 작성한 기록이 없습니다. 오늘 첫 체크를 시작해 보세요."
          />
        </div>
      </section>
    </div>
  );
}
