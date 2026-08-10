import Link from "next/link";

import { CheckInStatusPill } from "@/components/checkin/check-in-status-pill";

type CheckInReportTask = {
  label: string;
  done: boolean;
  href: string;
};

type CheckInReportTasksProps = {
  daily: CheckInReportTask;
  weekly: CheckInReportTask | null;
};

function DailyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function WeeklyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <span className="check-in-task-card__chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function TaskCard({
  task,
  variant,
}: {
  task: CheckInReportTask;
  variant: "daily" | "weekly";
}) {
  return (
    <li>
      <Link
        href={task.href}
        className={`check-in-task-card shell-focus-ring${task.done ? " check-in-task-card--done" : ""}${variant === "weekly" ? " check-in-task-card--weekly" : ""}`}
      >
        <span className="check-in-task-card__icon">{variant === "weekly" ? <WeeklyIcon /> : <DailyIcon />}</span>
        <span className="check-in-task-card__body">
          <span className="check-in-task-card__label">{task.label}</span>
          <CheckInStatusPill done={task.done} pendingLabel="작성 필요" doneLabel="작성 완료" />
        </span>
        <ChevronIcon />
        <span className="sr-only">
          {task.label} — {task.done ? "완료된 기록 보기" : "작성하기"}
        </span>
      </Link>
    </li>
  );
}

export function CheckInReportTasks({ daily, weekly }: CheckInReportTasksProps) {
  return (
    <section aria-labelledby="check-in-report-tasks-heading" className="check-in-hub-section check-in-report-tasks">
      <div className="check-in-hub-section__head">
        <h2 id="check-in-report-tasks-heading" className="check-in-hub-section__title">
          리포트 작성하기
        </h2>
      </div>

      <ul className={`check-in-task-cards${weekly ? "" : " check-in-task-cards--single"}`}>
        <TaskCard task={daily} variant="daily" />
        {weekly && <TaskCard task={weekly} variant="weekly" />}
      </ul>
    </section>
  );
}
