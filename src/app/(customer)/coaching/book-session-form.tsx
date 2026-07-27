"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BookSessionFormProps = {
  entitlementId: string;
  sessionMinutes: number;
};

export function BookSessionForm({ entitlementId, sessionMinutes }: BookSessionFormProps) {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/coaching/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entitlementId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          answers: goal.trim() ? { goal: goal.trim() } : undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "예약에 실패했습니다.");
        return;
      }

      router.refresh();
      setScheduledAt("");
      setGoal("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-sm font-medium text-violet-900">새 코칭 예약 ({sessionMinutes}분)</p>
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(event) => setScheduledAt(event.target.value)}
        required
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <input
        type="text"
        value={goal}
        onChange={(event) => setGoal(event.target.value)}
        placeholder="코칭 목표 (선택)"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "예약 중..." : "예약하기"}
      </button>
    </form>
  );
}
