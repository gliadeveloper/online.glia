import Link from "next/link";

import { Typography } from "@/components/typography/typography";

type CheckInReportTask = {
  label: string;
  done: boolean;
  href: string;
  badge?: string | number | null;
};

type CheckInReportTasksProps = {
  daily: CheckInReportTask;
  weekly: CheckInReportTask | null;
};

function TaskButton({ done, href }: { done: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`check-in-report-tasks__action shell-focus-ring${done ? " check-in-report-tasks__action--done" : " check-in-report-tasks__action--write"}`}
    >
      <Typography as="span" role="bodySecondary" weight="medium" color={done ? "secondary" : "primary"}>
        {done ? "완료" : "작성"}
      </Typography>
    </Link>
  );
}

function TaskBadge({ value }: { value?: string | number | null }) {
  if (value == null || value === "") {
    return null;
  }

  return (
    <span className="check-in-report-tasks__badge" aria-hidden="true">
      <Typography as="span" role="caption" weight="semibold" color="secondary">
        {value}
      </Typography>
    </span>
  );
}

export function CheckInReportTasks({ daily, weekly }: CheckInReportTasksProps) {
  return (
    <section aria-labelledby="check-in-report-tasks-heading" className="check-in-section check-in-report-tasks">
      <Typography
        as="h2"
        id="check-in-report-tasks-heading"
        role="sectionTitle"
        weight="semibold"
        color="primary"
        className="check-in-section__title"
      >
        리포트 작성하기
      </Typography>

      <ul className="check-in-report-tasks__list">
        <li className="check-in-report-tasks__row">
          <div className="check-in-report-tasks__label">
            <TaskBadge value={daily.badge} />
            <Typography as="p" role="body" weight="medium" color="primary">
              {daily.label}
            </Typography>
          </div>
          <TaskButton done={daily.done} href={daily.href} />
        </li>

        {weekly && (
          <li className="check-in-report-tasks__row">
            <div className="check-in-report-tasks__label">
              <TaskBadge value={weekly.badge} />
              <Typography as="p" role="body" weight="medium" color="primary">
                {weekly.label}
              </Typography>
            </div>
            <TaskButton done={weekly.done} href={weekly.href} />
          </li>
        )}
      </ul>
    </section>
  );
}
