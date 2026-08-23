"use client";

import type { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";
import { normalizeMarkdownDraft, prepareMarkdownContent } from "@/lib/markdown-content";
import "./lesson-block-editor.css";

export type BlockNoteEditorFieldHandle = {
  exportForSave: () => Promise<{ body: string; blocks: Block[] }>;
};

type BlockNoteEditorFieldProps = {
  body: string | null;
  metadata: unknown;
  uploadFile?: (file: File) => Promise<string>;
  disabled?: boolean;
};

export const BlockNoteEditorField = forwardRef<BlockNoteEditorFieldHandle, BlockNoteEditorFieldProps>(
  function BlockNoteEditorField({ body, metadata, uploadFile, disabled = false }, ref) {
    const initialBlocks = useMemo(() => getBlockNoteBlocksFromMetadata(metadata), [metadata]);
    const loadedFromMarkdownRef = useRef(false);

    const editor = useCreateBlockNote(
      {
        initialContent: initialBlocks ?? undefined,
        uploadFile,
      },
      [uploadFile],
    );

    useEffect(() => {
      editor.isEditable = !disabled;
    }, [disabled, editor]);

    useEffect(() => {
      if (initialBlocks?.length) return;
      if (!body?.trim() || loadedFromMarkdownRef.current) return;

      loadedFromMarkdownRef.current = true;
      const markdown = prepareMarkdownContent(body);
      const blocks = editor.tryParseMarkdownToBlocks(markdown);

      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
    }, [body, editor, initialBlocks]);

    useImperativeHandle(
      ref,
      () => ({
        exportForSave: async () => {
          const blocks = editor.document;
          const exported = await editor.blocksToMarkdownLossy(blocks);
          return {
            body: normalizeMarkdownDraft(exported.trim()),
            blocks: blocks as Block[],
          };
        },
      }),
      [editor],
    );

    return (
      <div className="lesson-block-editor">
        <BlockNoteView editor={editor} theme="light" />
      </div>
    );
  },
);
