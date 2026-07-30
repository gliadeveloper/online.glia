"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CoachSessionFeedbackPanelProps = {
  sessionId: string;
  summary: string | null;
  bodyMarkdown: string | null;
  publicationStatus: string;
  hasSharedReport: boolean;
};

export function CoachSessionFeedbackPanel({
  sessionId,
  summary: initialSummary,
  bodyMarkdown: initialBody,
  publicationStatus: initialStatus,
  hasSharedReport,
}: CoachSessionFeedbackPanelProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBody ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(publicationStatus: "DRAFT" | "PUBLISHED") {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim() || null,
          bodyMarkdown: bodyMarkdown.trim() || null,
          publicationStatus,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!hasSharedReport && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          회원이 체크인 공유를 수락하면 기록을 확인할 수 있습니다. 피드백은 공유 전에도 임시 저장할 수
          있습니다.
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">요약 (선택)</label>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">피드백 본문 (Markdown)</label>
        <textarea
          value={bodyMarkdown}
          onChange={(event) => setBodyMarkdown(event.target.value)}
          rows={14}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-sm"
          placeholder="## 이번 회차 피드백&#10;&#10;공유해 주신 체크인을 바탕으로..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => save("DRAFT")}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "저장 중..." : "임시 저장"}
        </button>
        <button
          type="button"
          disabled={loading || !bodyMarkdown.trim()}
          onClick={() => save("PUBLISHED")}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          회원에게 발행
        </button>
      </div>

      {initialStatus === "PUBLISHED" && (
        <p className="text-sm text-emerald-700">발행됨 — 회원은 코칭 탭에서 확인할 수 있습니다.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
