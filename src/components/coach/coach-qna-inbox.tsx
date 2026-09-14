import Link from "next/link";

import { displayName, formatSeoulDateHeading, seoulDateKey, type CoachPublishRow } from "@/lib/coach-coaching-board";
import { formatPostRelativeTime } from "@/lib/post-content";

export function CoachQnaInbox({ rows }: { rows: CoachPublishRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
        답변 대기 중인 질문이 없습니다.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/coach/sessions/${row.id}?tab=qna`}
            className="block px-5 py-4 transition hover:bg-zinc-50"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{displayName(row.user)}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {row.entitlement.coachingOffering.title} · {row.sessionNo}회차 · {row.title}
                </p>
                {row.pendingPreview ? (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{row.pendingPreview}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-amber-800">미답 {row.pendingReplyCount}</p>
                {row.pendingAt ? (
                  <p className="mt-1 text-xs text-zinc-400">
                    {formatPostRelativeTime(new Date(row.pendingAt))}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-400">
                    {formatSeoulDateHeading(seoulDateKey(row.scheduledAt))}
                  </p>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
