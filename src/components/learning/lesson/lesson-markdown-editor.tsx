"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import type { BlockNoteEditorFieldHandle } from "@/components/learning/lesson/blocknote-editor-field";
import { buildContentMetadataWithBlockNote } from "@/lib/blocknote-content";
import { getLessonMarkdownContent } from "@/lib/lesson-markdown-content";
import { uploadLessonImage } from "@/lib/media/lesson-image-upload-client";

import "./lesson-block-editor.css";

const BlockNoteEditorField = dynamic(
  () =>
    import("@/components/learning/lesson/blocknote-editor-field").then(
      (mod) => mod.BlockNoteEditorField,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        블록 에디터 불러오는 중…
      </div>
    ),
  },
);

type ContentRow = {
  id: string;
  type: string;
  body: string | null;
  title?: string | null;
  metadata?: unknown;
};

type LessonMarkdownEditorProps = {
  lessonId: string;
  courseId: string;
  contents: ContentRow[];
  apiRole: "admin" | "coach";
};

export function LessonMarkdownEditor({
  lessonId,
  courseId,
  contents,
  apiRole,
}: LessonMarkdownEditorProps) {
  const router = useRouter();
  const existing = getLessonMarkdownContent(contents);
  const editorRef = useRef<BlockNoteEditorFieldHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => uploadLessonImage({ file, courseId, lessonId, apiRole }),
    [apiRole, courseId, lessonId],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editorRef.current) return;

    setBusy(true);
    setError(null);

    const base = apiRole === "admin" ? "/api/admin" : "/api/coach";
    const url = existing
      ? `${base}/contents/${existing.id}`
      : `${base}/lessons/${lessonId}/contents`;
    const method = existing ? "PATCH" : "POST";

    try {
      const { body, blocks } = await editorRef.current.exportForSave();
      const metadata = buildContentMetadataWithBlockNote(existing?.metadata, blocks);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "HTML",
          title: "본문",
          body,
          metadata,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="lesson-markdown-editor">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-zinc-900">블록 에디터</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Notion처럼 블록 단위로 작성합니다. `/` 로 제목·목록 등을 추가할 수 있습니다.
            이미지는 블록에 끌어다 놓거나 업로드하세요(R2).
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <BlockNoteEditorField
          ref={editorRef}
          key={existing?.id ?? `new-${lessonId}`}
          body={existing?.body ?? null}
          metadata={existing?.metadata ?? null}
          uploadFile={uploadFile}
          disabled={busy}
        />

        <p className="mt-3 text-xs text-zinc-500">
          저장하면 수강생 화면에도 동일한 블록으로 표시됩니다.
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-fit rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
