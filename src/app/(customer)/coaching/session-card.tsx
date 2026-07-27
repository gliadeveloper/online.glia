"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { coachingSessionLabels } from "@/lib/customer-labels";
import type { CoachingSessionStatus } from "@/generated/prisma/client";

type SessionCardProps = {
  sessionId: string;
  sessionNo: number;
  coachName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: CoachingSessionStatus;
  meetingUrl: string | null;
  goal: string | null;
  canCancel: boolean;
};

export function SessionCard({
  sessionId,
  sessionNo,
  coachName,
  scheduledAt,
  durationMinutes,
  status,
  meetingUrl,
  goal,
  canCancel,
}: SessionCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelSession() {
    if (!confirm("이 코칭 세션을 취소하시겠습니까?")) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/coaching/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", cancelReason: "고객 요청" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "취소에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  const isUpcoming = ["SCHEDULED", "CONFIRMED", "RESCHEDULED"].includes(status);

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {sessionNo}회차 · {coachName}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {new Date(scheduledAt).toLocaleString("ko-KR")} · {durationMinutes}분
          </p>
          {goal && (
            <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
              목표: {goal}
            </p>
          )}
          {meetingUrl && isUpcoming && (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              Zoom 참여
            </a>
          )}
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
          {coachingSessionLabels[status]}
        </span>
      </div>
      {canCancel && isUpcoming && (
        <div className="mt-3">
          <button
            type="button"
            onClick={cancelSession}
            disabled={busy}
            className="text-sm font-medium text-red-600 disabled:opacity-60"
          >
            {busy ? "취소 중..." : "세션 취소"}
          </button>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}
