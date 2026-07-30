"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CoachShareRequestPanelProps = {
  sessionId: string;
  initialScopeType: "WEEK" | "RANGE";
  initialWeekPeriodKey: string | null;
  initialStartDate: string | null;
  initialEndDate: string | null;
  initialMessage: string | null;
  initialStatus: string | null;
  canRequest: boolean;
};

export function CoachShareRequestPanel({
  sessionId,
  initialScopeType,
  initialWeekPeriodKey,
  initialStartDate,
  initialEndDate,
  initialMessage,
  initialStatus,
  canRequest,
}: CoachShareRequestPanelProps) {
  const router = useRouter();
  const [scopeType, setScopeType] = useState<"WEEK" | "RANGE">(initialScopeType);
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [coachMessage, setCoachMessage] = useState(initialMessage ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitRequest() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/sessions/${sessionId}/share-grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopeType,
          weekPeriodKey: scopeType === "WEEK" ? initialWeekPeriodKey : undefined,
          startDate: scopeType === "RANGE" ? startDate : undefined,
          endDate: scopeType === "RANGE" ? endDate : undefined,
          coachMessage: coachMessage.trim() || null,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelRequest() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/sessions/${sessionId}/share-grant`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "취소에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!canRequest) {
    return (
      <p className="text-sm text-zinc-500">
        이 회차는 이미 체크인 공유가 완료되었거나, 더 이상 요청할 수 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-700">공유 범위</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scopeType"
            checked={scopeType === "WEEK"}
            onChange={() => setScopeType("WEEK")}
          />
          이번 주 (세션 예정 주)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scopeType"
            checked={scopeType === "RANGE"}
            onChange={() => setScopeType("RANGE")}
          />
          기간 지정 (최대 14일)
        </label>
      </fieldset>

      {scopeType === "RANGE" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">회원에게 전할 메시지 (선택)</label>
        <textarea
          value={coachMessage}
          onChange={(event) => setCoachMessage(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          placeholder="2회차 피드백 준비를 위해 체크인 기록 공유를 요청합니다."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={submitRequest}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "처리 중..." : initialStatus === "PENDING" ? "요청 수정·재전송" : "공유 요청 보내기"}
        </button>

        {initialStatus === "PENDING" && (
          <button
            type="button"
            disabled={loading}
            onClick={cancelRequest}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60"
          >
            요청 취소
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
