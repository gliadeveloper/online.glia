"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  CoachingSessionBlockEditor,
  type CoachingSessionBlockEditorHandle,
} from "@/components/coaching/coaching-session-block-editor";
import { buildContentMetadataWithBlockNote } from "@/lib/blocknote-content";

type CoachSessionFeedbackPanelProps = {
  sessionId: string;
  summary: string | null;
  bodyMarkdown: string | null;
  bodyMetadata: unknown;
  publicationStatus: string;
};

export function CoachSessionFeedbackPanel({
  sessionId,
  summary: initialSummary,
  bodyMarkdown: initialBody,
  bodyMetadata: initialBodyMetadata,
  publicationStatus: initialStatus,
}: CoachSessionFeedbackPanelProps) {
  const router = useRouter();
  const editorRef = useRef<CoachingSessionBlockEditorHandle>(null);
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(publicationStatus: "DRAFT" | "PUBLISHED") {
    setLoading(true);
    setError(null);

    try {
      const exported = editorRef.current
        ? await editorRef.current.exportForSave()
        : { body: initialBody ?? "", blocks: [] };
      const bodyMarkdown = exported.body.trim() || null;
      const bodyMetadata = buildContentMetadataWithBlockNote(initialBodyMetadata, exported.blocks);

      const response = await fetch(`/api/coach/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim() || null,
          bodyMarkdown,
          bodyMetadata,
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
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">요약 (선택)</label>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">피드백 본문</label>
        <CoachingSessionBlockEditor
          ref={editorRef}
          sessionId={sessionId}
          body={initialBody}
          bodyMetadata={initialBodyMetadata}
          apiRole="coach"
          disabled={loading}
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
          disabled={loading}
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
