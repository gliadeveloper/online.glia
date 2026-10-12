"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  CoachingSessionBlockEditor,
  type CoachingSessionBlockEditorHandle,
} from "@/components/coaching/coaching-session-block-editor";
import { mediaBodyVersion } from "@/lib/media/body-version";
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
  const savedBody = useRef({ body: initialBody, metadata: initialBodyMetadata });
  const editorRef = useRef<CoachingSessionBlockEditorHandle>(null);
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [loading, setLoading] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(publicationStatus: "DRAFT" | "PUBLISHED") {
    if (!editorReady || !editorRef.current || loading || uploadBusy) return;
    setLoading(true);
    setError(null);

    try {
      const exported = await editorRef.current.exportForSave();
      const bodyMarkdown = exported.body.trim() || null;
      const bodyMetadata = buildContentMetadataWithBlockNote(savedBody.current.metadata, exported.blocks, 2);

      const response = await fetch(`/api/coach/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedBodyVersion: await mediaBodyVersion(savedBody.current),
          summary: summary.trim() || null,
          bodyMarkdown,
          bodyMetadata,
          publicationStatus,
        }),
      });

      const data = (await response.json()) as { error?: string; bodyMarkdown: string | null; bodyMetadata: unknown };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      savedBody.current = { body: data.bodyMarkdown, metadata: data.bodyMetadata };
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.");
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
        <p className="text-xs text-zinc-500">
          이미지·영상·오디오 블록을 본문에 추가할 수 있습니다.
        </p>
        <CoachingSessionBlockEditor
          ref={editorRef}
          sessionId={sessionId}
          body={initialBody}
          bodyMetadata={initialBodyMetadata}
          apiRole="coach"
          disabled={loading}
          onUploadBusyChange={setUploadBusy}
          onReadyChange={setEditorReady}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || uploadBusy || !editorReady}
          onClick={() => save("DRAFT")}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "저장 중..." : "임시 저장"}
        </button>
        <button
          type="button"
          disabled={loading || uploadBusy || !editorReady}
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
