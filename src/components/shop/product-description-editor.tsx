"use client";

import dynamic from "next/dynamic";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import type { BlockNoteEditorFieldHandle } from "@/components/learning/lesson/blocknote-editor-field";
import { uploadProductDescriptionImage } from "@/lib/media/product-image-upload-client";

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
  apiRole: "admin" | "coach";
  description: string | null;
  descriptionMetadata: unknown;
  disabled?: boolean;
};

export const ProductDescriptionEditor = forwardRef<
  ProductDescriptionEditorHandle,
  ProductDescriptionEditorProps
>(function ProductDescriptionEditor(
  { productId, apiRole, description, descriptionMetadata, disabled = false },
  ref,
) {
  const editorRef = useRef<BlockNoteEditorFieldHandle>(null);
  const uploadFile = useCallback(
    (file: File) => {
      if (!productId) {
        return Promise.reject(new Error("상품을 저장한 뒤 이미지를 올릴 수 있습니다."));
      }
      return uploadProductDescriptionImage({ file, productId, apiRole });
    },
    [apiRole, productId],
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
      key={productId ? `product-description-${productId}` : "product-description-new"}
      body={description}
      metadata={descriptionMetadata}
      uploadFile={productId ? uploadFile : undefined}
      disabled={disabled}
    />
  );
});
