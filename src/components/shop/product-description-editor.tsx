"use client";

import dynamic from "next/dynamic";
import { forwardRef, useImperativeHandle, useRef } from "react";

import type { BlockNoteEditorFieldHandle } from "@/components/learning/lesson/blocknote-editor-field";

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

export type ProductDescriptionEditorHandle = BlockNoteEditorFieldHandle;

type ProductDescriptionEditorProps = {
  productId?: string;
  description: string | null;
  descriptionMetadata: unknown;
  disabled?: boolean;
};

export const ProductDescriptionEditor = forwardRef<
  ProductDescriptionEditorHandle,
  ProductDescriptionEditorProps
>(function ProductDescriptionEditor(
  { productId, description, descriptionMetadata, disabled = false },
  ref,
) {
  const editorRef = useRef<BlockNoteEditorFieldHandle>(null);

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
      key={productId ? `product-description-${productId}` : "product-description-new"}
      body={description}
      metadata={descriptionMetadata}
      disabled={disabled}
    />
  );
});
