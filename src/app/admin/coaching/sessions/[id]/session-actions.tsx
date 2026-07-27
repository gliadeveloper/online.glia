"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SessionActionsProps = {
  sessionId: string;
  status: string;
  meetingUrl: string | null;
};

export function SessionActions({ sessionId, status, meetingUrl }: SessionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(meetingUrl ?? "");
  const [scheduledAt, setScheduledAt] = useState("");

  const canModify = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "RESCHEDULED"].includes(status);

  async function runAction(
    action: "cancel" | "complete" | "reschedule" | "set_meeting",
    extra?: Record<string, string>,
  ) {
    setLoading(action);
    setError(null);

    try {
      const response = await fetch(`/api/admin/coaching/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "처리에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">운영 액션</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">미팅 URL</label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://zoom.us/j/..."
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => runAction("set_meeting", { meetingUrl: url, meetingProvider: "zoom" })}
            disabled={loading !== null}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            저장
          </button>
        </div>
      </div>

      {canModify && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">일정 변경</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  runAction("reschedule", {
                    scheduledAt: new Date(scheduledAt).toISOString(),
                  })
                }
                disabled={loading !== null || !scheduledAt}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                변경
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction("complete")}
              disabled={loading !== null}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading === "complete" ? "처리 중..." : "완료 처리"}
            </button>
            <button
              type="button"
              onClick={() => runAction("cancel", { cancelReason: "Admin cancelled" })}
              disabled={loading !== null}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              {loading === "cancel" ? "처리 중..." : "취소"}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
