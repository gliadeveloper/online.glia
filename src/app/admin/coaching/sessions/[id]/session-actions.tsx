"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  CoachingSessionBlockEditor,
  type CoachingSessionBlockEditorHandle,
} from "@/components/coaching/coaching-session-block-editor";
import { buildContentMetadataWithBlockNote } from "@/lib/blocknote-content";

type SessionActionsProps = {
  sessionId: string;
  title: string;
  summary: string | null;
  scheduledAt: string;
  bodyMarkdown: string | null;
  bodyMetadata: unknown;
  publicationStatus: string;
  progressStatus: string;
};

export function SessionActions({
  sessionId,
  title: initialTitle,
  summary: initialSummary,
  scheduledAt: initialScheduledAt,
  bodyMarkdown: initialBody,
  bodyMetadata: initialBodyMetadata,
  publicationStatus: initialPublicationStatus,
  progressStatus: initialProgressStatus,
}: SessionActionsProps) {
  const router = useRouter();
  const editorRef = useRef<CoachingSessionBlockEditorHandle>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt.slice(0, 16));
  const [publicationStatus, setPublicationStatus] = useState(initialPublicationStatus);
  const [progressStatus, setProgressStatus] = useState(initialProgressStatus);

  async function exportBody() {
    if (!editorRef.current) {
      return { bodyMarkdown: initialBody, bodyMetadata: initialBodyMetadata };
    }

    const { body, blocks } = await editorRef.current.exportForSave();
    return {
      bodyMarkdown: body || null,
      bodyMetadata: buildContentMetadataWithBlockNote(initialBodyMetadata, blocks),
    };
  }

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

  async function handleSave(extra: Record<string, unknown> = {}) {
    const body = await exportBody();
    await save({
      title,
      summary: summary || null,
      scheduledAt: new Date(scheduledAt).toISOString(),
      bodyMarkdown: body.bodyMarkdown,
      bodyMetadata: body.bodyMetadata,
      publicationStatus,
      progressStatus,
      ...extra,
    });
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
        <label className="text-sm font-medium text-zinc-700">본문</label>
        <CoachingSessionBlockEditor
          ref={editorRef}
          sessionId={sessionId}
          body={initialBody}
          bodyMetadata={initialBodyMetadata}
          apiRole="admin"
          disabled={loading}
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
          onClick={() => handleSave()}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSave({ publicationStatus: "PUBLISHED" })}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          발행하기
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
