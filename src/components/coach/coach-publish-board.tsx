import Link from "next/link";

import {
  coachPublicationLabels,
  displayName,
  formatSeoulDateHeading,
  seoulDateKey,
  type CoachPublishRow,
  type PublishBoard,
} from "@/lib/coach-coaching-board";

function StatusChip({ status }: { status: CoachPublishRow["publicationStatus"] }) {
  const tone =
    status === "DRAFT"
      ? "bg-amber-50 text-amber-800"
      : status === "PUBLISHED"
        ? "bg-emerald-50 text-emerald-800"
        : "bg-zinc-100 text-zinc-600";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {coachPublicationLabels[status]}
    </span>
  );
}

function SessionWorkRow({
  row,
  dateLabel,
}: {
  row: CoachPublishRow;
  dateLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <Link href={`/coach/sessions/${row.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {dateLabel ? <span className="text-xs font-medium text-amber-800">{dateLabel}</span> : null}
          <p className="font-semibold text-zinc-900">{displayName(row.user)}</p>
          <StatusChip status={row.publicationStatus} />
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {row.sessionNo}회차 · {row.title}
        </p>
      </Link>
      <Link
        href={`/coach/coaching/entitlements/${row.entitlement.id}`}
        className="shrink-0 text-sm text-emerald-700 hover:underline"
      >
        {row.entitlement.coachingOffering.title}
      </Link>
    </div>
  );
}

export function CoachPublishBoard({ board }: { board: PublishBoard }) {
  const dueCount = board.overdue.length + board.today.length;

  if (dueCount === 0 && board.upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
        열 코칭 페이지가 없습니다. 코칭권에서 발행일을 나누면 날짜별로 모입니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dueCount === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
          오늘 열 페이지는 없습니다. 예정 {board.upcoming.reduce((n, group) => n + group.sessions.length, 0)}건은
          아래에서 볼 수 있습니다.
        </p>
      ) : null}

      {board.overdue.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-3">
            <p className="text-sm font-semibold text-amber-900">밀림 {board.overdue.length}</p>
            <p className="mt-0.5 text-xs text-amber-800">발행일이 지났습니다. 지금 열 수 있습니다.</p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {board.overdue.map((row) => (
              <li key={row.id}>
                <SessionWorkRow
                  row={row}
                  dateLabel={formatSeoulDateHeading(seoulDateKey(row.scheduledAt))}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-3">
          <p className="text-sm font-semibold text-emerald-900">
            오늘 {formatSeoulDateHeading(board.todayKey)} · {board.today.length}건
          </p>
        </div>
        {board.today.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">오늘 예정된 발행이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {board.today.map((row) => (
              <li key={row.id}>
                <SessionWorkRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {board.upcoming.length > 0 ? (
        <section className="space-y-2">
          <p className="px-1 text-sm font-semibold text-zinc-700">예정</p>
          {board.upcoming.map((group) => (
            <details
              key={group.dateKey}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-zinc-800">
                {formatSeoulDateHeading(group.dateKey)}
                <span className="ml-2 text-zinc-500">{group.sessions.length}</span>
              </summary>
              <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                {group.sessions.map((row) => (
                  <li key={row.id}>
                    <SessionWorkRow row={row} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      ) : null}
    </div>
  );
}
