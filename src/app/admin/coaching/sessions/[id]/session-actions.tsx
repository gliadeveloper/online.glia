"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SessionActionsProps = {
  sessionId: string;
  title: string;
  summary: string | null;
  scheduledAt: string;
  bodyMarkdown: string | null;
  publicationStatus: string;
  progressStatus: string;
};

export function SessionActions({
  sessionId,
  title: initialTitle,
  summary: initialSummary,
  scheduledAt: initialScheduledAt,
  bodyMarkdown: initialBody,
  publicationStatus: initialPublicationStatus,
  progressStatus: initialProgressStatus,
}: SessionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initialScheduledAt.slice(0, 16),
  );
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBody ?? "");
  const [publicationStatus, setPublicationStatus] = useState(initialPublicationStatus);
  const [progressStatus, setProgressStatus] = useState(initialProgressStatus);

  async function save(patch: Record<string, unknown>) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/coaching/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
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
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">회차 편집</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">제목</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">오픈 예정일</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">요약</label>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">본문 (Markdown)</label>
        <textarea
          value={bodyMarkdown}
          onChange={(event) => setBodyMarkdown(event.target.value)}
          rows={12}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-sm"
          placeholder="## 이번 회차&#10;&#10;코칭 내용을 Markdown으로 작성하세요."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">발행 상태</label>
          <select
            value={publicationStatus}
            onChange={(event) => setPublicationStatus(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="EMPTY">미등록</option>
            <option value="DRAFT">작성 중</option>
            <option value="PUBLISHED">발행</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">진행 상태</label>
          <select
            value={progressStatus}
            onChange={(event) => setProgressStatus(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="NOT_STARTED">시작 전</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="COMPLETED">완료</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            save({
              title,
              summary: summary || null,
              scheduledAt: new Date(scheduledAt).toISOString(),
              bodyMarkdown: bodyMarkdown || null,
              publicationStatus,
              progressStatus,
            })
          }
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          disabled={loading || !bodyMarkdown.trim()}
          onClick={() =>
            save({
              title,
              summary: summary || null,
              scheduledAt: new Date(scheduledAt).toISOString(),
              bodyMarkdown,
              publicationStatus: "PUBLISHED",
              progressStatus,
            })
          }
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          발행하기
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
