import Link from "next/link";
import { CalendarDays, ChevronRight, Lock, Users } from "lucide-react";

import { CheckInDayStrip } from "@/components/checkin/check-in-day-strip";
import { CheckInHistoryList } from "@/components/checkin/check-in-history-list";
import { CheckInHubStripTitle } from "@/components/checkin/check-in-hub-strip-title";
import { formatCheckInListDate } from "@/lib/checkin-dates";
import type { CheckInHubData } from "@/lib/checkin-hub";

type CheckInHubPanelProps = {
  data: CheckInHubData;
};

function CheckInWeeklyTaskRow({ task }: { task: NonNullable<CheckInHubData["weeklyTask"]> }) {
  const isLocked = !task.done && !task.writable;

  if (isLocked) {
    return (
      <div className="glia-ci-row glia-ci-row--locked" aria-disabled="true">
        <span className="glia-ci-icon glia-ci-icon--info" aria-hidden="true">
          <Lock strokeWidth={2} size={20} />
        </span>
        <span className="glia-ci-row__body">
          <span className="glia-ci-row__title">{task.label}</span>
          <span className="glia-ci-row__meta">{task.lockedHint ?? "이번 주"}</span>
        </span>
      </div>
    );
  }

  return (
    <Link href={task.href} className="glia-ci-row">
      <span className="glia-ci-icon glia-ci-icon--recovery" aria-hidden="true">
        <CalendarDays strokeWidth={2} size={20} />
      </span>
      <span className="glia-ci-row__body">
        <span className="glia-ci-row__title">{task.label}</span>
        <span className="glia-ci-row__meta">이번 주</span>
      </span>
      <span className={`glia-ci-pill${task.done ? " glia-ci-pill--done" : " glia-ci-pill--pending"}`}>
        {task.done ? "완료" : "작성 필요"}
      </span>
      <ChevronRight className="glia-ci-chevron" strokeWidth={2} size={16} />
      <span className="sr-only">
        {task.label} — {task.done ? "완료된 기록 보기" : "작성하기"}
      </span>
    </Link>
  );
}

export function CheckInHubPanel({ data }: CheckInHubPanelProps) {
  if (!data.dailyForm) {
    return (
      <div className="glia-ci-hub__feed">
        <section className="glia-ci__section">
          <p className="glia-ci-empty">데일리 체크인 폼이 아직 준비되지 않았습니다.</p>
        </section>
      </div>
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
    <>
      <header className="glia-ci-hub__hero">
        <div className="glia-ci-hub__ambient" aria-hidden="true">
          <span className="glia-ci-hub__blob glia-ci-hub__blob--mint" />
          <span className="glia-ci-hub__blob glia-ci-hub__blob--blue" />
          <span className="glia-ci-hub__blob glia-ci-hub__blob--wash" />
        </div>

        <div className="glia-ci-hub__hero-copy">
          <p className="glia-ci-hub__date">{formatCheckInListDate(data.today)}</p>
          <h1 className="glia-ci-hub__title">
            <CheckInHubStripTitle todayDailyDone={data.todayDailyDone} streak={data.streak} />
          </h1>
          <p className="glia-ci-hub__lede">{data.streakTitle}</p>
          <p className="glia-ci-hub__philosophy">뇌 · 몸 · 회복 · 균형</p>
        </div>

        <CheckInDayStrip days={data.dayStrip} title="날짜별 체크" framed />
      </header>

      <div className="glia-ci-hub__feed">
        {data.weeklyTask ? (
          <section className="glia-ci__section" aria-labelledby="check-in-weekly-heading">
            <h2 id="check-in-weekly-heading" className="glia-ci__section-title">
              이번 주 <em>주간 체크</em>
            </h2>
            <CheckInWeeklyTaskRow task={data.weeklyTask} />
          </section>
        ) : null}

        <section className="glia-ci__section" aria-labelledby="check-in-coach-access-heading">
          <div>
            <h2 id="check-in-coach-access-heading" className="glia-ci__section-title">
              코치 공유
            </h2>
            <p className="glia-ci__section-meta">내 기록을 볼 코치를 직접 관리할 수 있어요.</p>
          </div>
          <Link href="/checkin/sharing" className="glia-ci-row">
            <span className="glia-ci-icon" aria-hidden="true">
              <Users strokeWidth={2} size={20} />
            </span>
            <span className="glia-ci-row__body">
              <span className="glia-ci-row__title">코치 접근 권한 관리</span>
              <span className="glia-ci-row__meta">허용한 코치만 기록을 볼 수 있습니다</span>
            </span>
            <ChevronRight className="glia-ci-chevron" strokeWidth={2} size={16} />
          </Link>
        </section>

        <section className="glia-ci__section" aria-labelledby="check-in-written-list-heading">
          <div className="glia-ci__section-head">
            <h2 id="check-in-written-list-heading" className="glia-ci__section-title">
              작성한 목록
            </h2>
            <Link href="/checkin/history" className="glia-ci__more">
              더보기
            </Link>
          </div>
          <CheckInHistoryList
            labelledBy="check-in-written-list-heading"
            items={historyItems}
            emptyMessage="아직 작성한 기록이 없습니다. 오늘 첫 체크를 시작해 보세요."
          />
        </section>
      </div>
    </>
  );
}
