"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  coachPublicationLabels,
  displayName,
  seoulDateKey,
} from "@/lib/coach-coaching-board";
import { coachingEntitlementLabels } from "@/lib/customer-labels";
import type { CoachingEntitlementStatus, CoachingSessionPublicationStatus } from "@/generated/prisma/client";

type BoardSession = {
  id: string;
  sessionNo: number;
  title: string;
  scheduledAt: string;
  publicationStatus: CoachingSessionPublicationStatus;
  pendingReplyCount: number;
};

type CoachEntitlementBoardProps = {
  entitlement: {
    id: string;
    status: CoachingEntitlementStatus;
    completedSessions: number;
    totalSessions: number;
    validUntil: string | null;
    user: { id: string; name: string | null; email: string };
    coachingOffering: { title: string };
  };
  sessions: BoardSession[];
};

export function CoachEntitlementBoard({ entitlement, sessions }: CoachEntitlementBoardProps) {
  const router = useRouter();
  const [dates, setDates] = useState(() =>
    Object.fromEntries(sessions.map((session) => [session.id, seoulDateKey(session.scheduledAt)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () => sessions.some((session) => dates[session.id] !== seoulDateKey(session.scheduledAt)),
    [dates, sessions],
  );

  const publishedCount = sessions.filter((session) => session.publicationStatus === "PUBLISHED").length;

  async function saveDates() {
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/coach/coaching/entitlements/${entitlement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessions: sessions.map((session) => ({
            id: session.id,
            scheduledAt: dates[session.id],
          })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">{entitlement.coachingOffering.title}</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">{displayName(entitlement.user)}</p>
        <p className="mt-2 text-sm text-zinc-600">
          발행 {publishedCount}/{entitlement.totalSessions} ·{" "}
          {coachingEntitlementLabels[entitlement.status]}
          {entitlement.validUntil
            ? ` · ~${new Date(entitlement.validUntil).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`
            : ""}
        </p>
        <Link
          href={`/coach/customers/${entitlement.user.id}`}
          className="mt-3 inline-block text-sm text-emerald-700 hover:underline"
        >
          고객 상세
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-zinc-900">회차 · 발행일</h2>
            <p className="mt-1 text-sm text-zinc-500">
              날짜를 나누면 코칭 홈의 오늘·밀림 보드에 맞춰 올라갑니다. 발행 버튼은 막지 않습니다.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={saveDates}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "저장 중…" : "발행일 저장"}
          </button>
        </div>

        {error ? <p className="px-5 pt-4 text-sm text-red-700">{error}</p> : null}
        {saved && !dirty ? <p className="px-5 pt-4 text-sm text-emerald-700">발행일을 저장했습니다.</p> : null}

        {sessions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">회차가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/coach/sessions/${session.id}`}
                      className="font-medium text-zinc-900 hover:text-emerald-700"
                    >
                      {session.sessionNo}회차 · {session.title}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        session.publicationStatus === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-800"
                          : session.publicationStatus === "DRAFT"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {coachPublicationLabels[session.publicationStatus]}
                    </span>
                    {session.pendingReplyCount > 0 ? (
                      <Link
                        href={`/coach/sessions/${session.id}?tab=qna`}
                        className="text-xs font-semibold text-amber-800 hover:underline"
                      >
                        미답 {session.pendingReplyCount}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <span className="sr-only">{session.sessionNo}회차 발행일</span>
                  <input
                    type="date"
                    value={dates[session.id] ?? ""}
                    onChange={(event) => {
                      setSaved(false);
                      setDates((current) => ({ ...current, [session.id]: event.target.value }));
                    }}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <Link
                  href={`/coach/sessions/${session.id}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  {session.publicationStatus === "PUBLISHED" ? "수정" : "작성"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
