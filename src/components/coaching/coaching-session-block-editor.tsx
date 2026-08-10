"use client";

import dynamic from "next/dynamic";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import type { BlockNoteEditorFieldHandle } from "@/components/learning/lesson/blocknote-editor-field";
import { uploadCoachingImage } from "@/lib/media/coaching-image-upload-client";

import "@/components/learning/lesson/lesson-block-editor.css";

const BlockNoteEditorField = dynamic(
  () =>
    import("@/components/learning/lesson/blocknote-editor-field").then(
      (mod) => mod.BlockNoteEditorField,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        블록 에디터 불러오는 중…
      </div>
    ),
  },
);

export type CoachingSessionBlockEditorHandle = BlockNoteEditorFieldHandle;

type CoachingSessionBlockEditorProps = {
  sessionId: string;
  body: string | null;
  bodyMetadata: unknown;
  apiRole: "admin" | "coach";
  disabled?: boolean;
};

export const CoachingSessionBlockEditor = forwardRef<
  CoachingSessionBlockEditorHandle,
  CoachingSessionBlockEditorProps
>(function CoachingSessionBlockEditor(
  { sessionId, body, bodyMetadata, apiRole, disabled = false },
  ref,
) {
  const editorRef = useRef<BlockNoteEditorFieldHandle>(null);

  const uploadFile = useCallback(
    async (file: File) => uploadCoachingImage({ file, sessionId, apiRole }),
    [apiRole, sessionId],
  );

  useImperativeHandle(ref, () => ({
    exportForSave: async () => {
      if (!editorRef.current) {
        throw new Error("Editor not ready");
      }
      return editorRef.current.exportForSave();
    },
  }));

  return (
    <BlockNoteEditorField
      ref={editorRef}
      key={`coaching-session-${sessionId}`}
      body={body}
      metadata={bodyMetadata}
      uploadFile={uploadFile}
      disabled={disabled}
    />
  );
});
