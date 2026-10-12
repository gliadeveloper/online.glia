"use client";

import type { Block, PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { MediaLibraryDialog } from "@/components/media/media-library-dialog";
import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";
import { normalizeMarkdownDraft } from "@/lib/markdown-content";
import { createLibraryUploader, type LibraryScope, type MediaApiRole, type UploadedMedia } from "@/lib/media/library-client";
import "./lesson-block-editor.css";

export type BlockNoteEditorFieldHandle = {
  exportForSave: () => Promise<{ body: string; blocks: Block[] }>;
};

type BlockNoteEditorFieldProps = {
  body: string | null;
  metadata: unknown;
  uploadFile?: (file: File) => Promise<string>;
  /** Opt-in only for course/coaching editors; product descriptions remain separate. */
  mediaLibraryRole?: MediaApiRole;
  onUploadBusyChange?: (busy: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
  disabled?: boolean;
};

type FailedUpload = { file: File; scope: LibraryScope; blockId?: string; message: string };
type Capabilities = { role: MediaApiRole; libraryEnabled: boolean; uploadEnabled: boolean };

export const BlockNoteEditorField = forwardRef<BlockNoteEditorFieldHandle, BlockNoteEditorFieldProps>(
  function BlockNoteEditorField({ body, metadata, uploadFile, mediaLibraryRole, onUploadBusyChange, onReadyChange, disabled = false }, ref) {
    // Refreshing server props must not replace an unsaved document or its undo history.
    const initial = useRef({ blocks: getBlockNoteBlocksFromMetadata(metadata), body });
    const loaded = useRef(false);
    const mounted = useRef(true);
    const pending = useRef(0);
    const tail = useRef<Promise<unknown>>(Promise.resolve());
    const callbacks = useRef({ onUploadBusyChange, disabled });
    useEffect(() => { callbacks.current = { onUploadBusyChange, disabled }; }, [onUploadBusyChange, disabled]);
    const uploader = useMemo(() => mediaLibraryRole ? createLibraryUploader(mediaLibraryRole) : null, [mediaLibraryRole]);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [failed, setFailed] = useState<FailedUpload | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [nativeUploadError, setNativeUploadError] = useState<string | null>(null);
    const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
    const [capabilityError, setCapabilityError] = useState(false);
    const [capabilityRetry, setCapabilityRetry] = useState(0);
    const rollout = capabilities?.role === mediaLibraryRole ? capabilities : null;
    useEffect(() => {
      if (!mediaLibraryRole) return;
      const controller = new AbortController();
      void (async () => {
        try {
          const response = await fetch(`/api/${mediaLibraryRole}/media/library/capabilities`, { cache: "no-store", signal: controller.signal });
          const data = await response.json();
          if (!response.ok || typeof data.libraryEnabled !== "boolean" || typeof data.uploadEnabled !== "boolean") throw new Error("Invalid capabilities");
          if (!controller.signal.aborted) { setCapabilities({ role: mediaLibraryRole, libraryEnabled: data.libraryEnabled, uploadEnabled: data.uploadEnabled }); setCapabilityError(false); }
        } catch { if (!controller.signal.aborted) setCapabilityError(true); }
      })();
      return () => controller.abort();
    }, [mediaLibraryRole, capabilityRetry]);
    const uploadAction = useRef<(file: File, blockId?: string) => Promise<string>>(async () => { throw new Error("파일 업로드를 준비 중입니다."); });
    const stableUpload = useCallback(async (file: File, blockId?: string) => {
      setNativeUploadError(null);
      try { return await uploadAction.current(file, blockId); }
      catch (error) {
        if (mounted.current) setNativeUploadError(error instanceof Error ? error.message : "파일 업로드에 실패했습니다.");
        // BlockNote's paste handler does not catch rejected upload promises.
        // An empty block update leaves its placeholder without publishing a URL.
        return {};
      }
    }, []);

    const editor = useCreateBlockNote({
      initialContent: initial.current.blocks ?? undefined,
      uploadFile: mediaLibraryRole || uploadFile ? stableUpload : undefined,
    });

    useEffect(() => { editor.isEditable = !disabled; }, [disabled, editor]);
    useEffect(() => {
      mounted.current = true;
      if (!loaded.current) {
        try {
          if (!initial.current.blocks?.length && initial.current.body?.trim()) {
            const source = initial.current.body.trim();
            const blocks = /^<(?:p|div|h[1-6]|ul|ol|table|figure|img|video|audio)\b/i.test(source)
              ? editor.tryParseHTMLToBlocks(source) : editor.tryParseMarkdownToBlocks(source);
            if (!blocks.length) throw new Error("Empty import");
            editor.replaceBlocks(editor.document, blocks);
          }
          loaded.current = true;
        } catch {
          setLoadError(true);
        }
      }
      onReadyChange?.(loaded.current);
      return () => { mounted.current = false; onReadyChange?.(false); };
    }, [editor, onReadyChange]);

    const runUpload = useCallback(async (file: File, scope: LibraryScope, blockId?: string, afterUpload?: (media: UploadedMedia) => void) => {
      if (!uploader || !rollout?.uploadEnabled || callbacks.current.disabled) throw new Error("지금은 파일을 추가할 수 없습니다.");
      pending.current++;
      setUploadBusy(true); setFailed(null);
      callbacks.current.onUploadBusyChange?.(true);
      const work = tail.current.catch(() => {}).then(() => uploader(file, scope, phase => {
        if (mounted.current) setStatus(`${file.name} · ${phase}`);
      }));
      tail.current = work;
      try {
        const media = await work;
        afterUpload?.(media);
        return media;
      }
      catch (e) {
        const message = e instanceof Error ? e.message : "파일 업로드에 실패했습니다.";
        if (mounted.current) setFailed({ file, scope, blockId, message });
        throw e;
      } finally {
        pending.current--;
        if (mounted.current && pending.current === 0) {
          setUploadBusy(false); setStatus(null); callbacks.current.onUploadBusyChange?.(false);
        }
      }
    }, [uploader, rollout]);

    useEffect(() => {
      uploadAction.current = async (file, blockId) => {
        if (callbacks.current.disabled) throw new Error("지금은 파일을 추가할 수 없습니다.");
        // Only an explicit disabled response selects the existing contextual uploader.
        // A failed capability request or a rejected new upload must not fall back.
        if (mediaLibraryRole) {
          if (!rollout) throw new Error("업로드 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.");
          if (rollout.libraryEnabled) return (await runUpload(file, "PERSONAL", blockId)).url;
        }
        if (!uploadFile) throw new Error("업로드를 지원하지 않습니다.");
        pending.current++; setUploadBusy(true); callbacks.current.onUploadBusyChange?.(true);
        try { return await uploadFile(file); }
        finally {
          pending.current--;
          if (mounted.current && pending.current === 0) { setUploadBusy(false); callbacks.current.onUploadBusyChange?.(false); }
        }
      };
    }, [mediaLibraryRole, rollout, runUpload, uploadFile]);

    function insertMedia(media: UploadedMedia, blockId?: string) {
      if (!mounted.current) return;
      const block: PartialBlock = {
        type: media.kind === "IMAGE" ? "image" : media.kind === "VIDEO" ? "video" : "audio",
        props: { url: media.url, name: media.name },
      };
      if (blockId && editor.getBlock(blockId)) {
        editor.updateBlock(blockId, block);
      } else {
        const anchor = editor.getTextCursorPosition().block;
        editor.insertBlocks([block], anchor, "after");
      }
      requestAnimationFrame(() => { if (mounted.current) editor.focus(); });
    }

    async function uploadAndInsert(file: File, scope: LibraryScope, blockId?: string) {
      try { await runUpload(file, scope, blockId, media => insertMedia(media, blockId)); }
      catch { /* Keep the selected File and reservation for the visible retry action. */ }
    }

    useImperativeHandle(ref, () => ({
      exportForSave: async () => {
        if (!loaded.current) throw new Error("편집기를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        if (pending.current > 0) throw new Error("파일 업로드와 확인이 끝난 뒤 저장해 주세요.");
        const blocks = editor.document;
        return { body: normalizeMarkdownDraft(editor.blocksToMarkdownLossy(blocks).trim()), blocks: blocks as Block[] };
      },
    }), [editor]);

    return <div className="lesson-block-editor">
      {loadError ? <div role="alert">본문을 불러오지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.</div> : null}
      {nativeUploadError ? <div role="alert">{nativeUploadError}</div> : null}
      {mediaLibraryRole && capabilityError ? <div role="alert">업로드 설정을 확인하지 못했습니다. <button type="button" onClick={() => setCapabilityRetry(v => v + 1)}>다시 확인</button></div> : null}
      {mediaLibraryRole && rollout?.libraryEnabled ? <MediaLibraryDialog apiRole={mediaLibraryRole} disabled={disabled || uploadBusy} uploadEnabled={rollout.uploadEnabled}
        onChoose={insertMedia} onUpload={uploadAndInsert} /> : null}
      {status ? <div className="media-library-upload-status" role="status">{status} · 확인이 끝나면 저장할 수 있어요.</div> : null}
      {failed ? <div className="media-library-upload-status" data-error="true" role="alert">
        <span>{failed.file.name}: {failed.message}</span>
        <button type="button" disabled={disabled || uploadBusy} onClick={() => void uploadAndInsert(failed.file, failed.scope, failed.blockId)}>다시 시도</button>
        <button type="button" disabled={uploadBusy} onClick={() => setFailed(null)}>닫기</button>
      </div> : null}
      <BlockNoteView editor={editor} theme="light" editable={!disabled} />
    </div>;
  },
);
