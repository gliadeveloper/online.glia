"use client";

import {
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  Quote,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import {
  editorHtmlToMarkdown,
  isEditorContentEmpty,
  markdownToEditorHtml,
} from "@/lib/community-editor-html";
import { uploadCommunityPostMedia } from "@/lib/media/community-media-upload-client";
import { normalizeMarkdownDraft } from "@/lib/markdown-content";

type MarkdownComposerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  hint?: string;
  disabled?: boolean;
  variant?: "glia" | "plain";
  allowMedia?: boolean;
};

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.m4v,.webm,.mov";

function markdownAlt(fileName: string, kind: "image" | "video") {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[[\]()]/g, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return base.slice(0, 80) || (kind === "video" ? "영상" : "사진");
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  onPrepare,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  onPrepare?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="glia-write__editor-tool"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        onPrepare?.();
        event.preventDefault();
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function MarkdownComposer({
  id,
  label,
  value,
  onChange,
  placeholder = "본문을 작성해 보세요.",
  minRows = 10,
  hint,
  disabled = false,
  variant = "glia",
  allowMedia,
}: MarkdownComposerProps) {
  const isPlain = variant === "plain";
  const mediaEnabled = allowMedia ?? !isPlain;
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const hydratedRef = useRef(false);
  const [empty, setEmpty] = useState(!value.trim());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const busy = disabled || uploading;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || hydratedRef.current) return;
    editor.innerHTML = markdownToEditorHtml(value);
    hydratedRef.current = true;
    setEmpty(isEditorContentEmpty(editor));
  }, [value]);

  function saveSelection() {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || selection.rangeCount === 0 || !editor) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }

  function rangeInEditor(): Range | null {
    const editor = editorRef.current;
    if (!editor) return null;

    const saved = savedRangeRef.current;
    try {
      if (saved && editor.contains(saved.startContainer)) {
        return saved;
      }
    } catch {
      savedRangeRef.current = null;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      return selection.getRangeAt(0);
    }

    return null;
  }

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    setEmpty(isEditorContentEmpty(editor));
    onChange(normalizeMarkdownDraft(editorHtmlToMarkdown(editor.innerHTML)));
  }

  function insertElement(element: HTMLElement) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    const range = rangeInEditor();

    if (range && selection) {
      try {
        range.collapse(false);
        range.insertNode(element);
        range.setStartAfter(element);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
      } catch {
        editor.appendChild(element);
      }
    } else {
      editor.appendChild(element);
    }

    emitChange();
  }

  function insertUploadedMedia(kind: "image" | "video", url: string, alt: string) {
    if (kind === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      video.className = "post-markdown__video";
      video.setAttribute("aria-label", alt);
      insertElement(video);
      return;
    }

    const image = document.createElement("img");
    image.src = url;
    image.alt = alt;
    insertElement(image);
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    const range = rangeInEditor();
    const selection = window.getSelection();
    if (editor && range && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(range);
      } catch {
        editor.focus();
      }
    } else {
      editor?.focus();
    }
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function toggleHeading() {
    runCommand(
      "formatBlock",
      document.queryCommandValue("formatBlock") === "h2" ||
        document.queryCommandValue("formatBlock") === "H2"
        ? "<p>"
        : "<h2>",
    );
  }

  function applyLink() {
    const url = window.prompt("링크 주소", "https://")?.trim();
    if (!url) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      const link = document.createElement("a");
      link.href = url;
      link.textContent = "링크";
      insertElement(link);
      return;
    }

    runCommand("createLink", url);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList).slice(0, 8);
    setUploadError(null);
    setUploading(true);

    try {
      for (const file of files) {
        const uploaded = await uploadCommunityPostMedia(file);
        insertUploadedMedia(uploaded.kind, uploaded.publicUrl, markdownAlt(file.name, uploaded.kind));
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;

    if (event.key === "b") {
      event.preventDefault();
      runCommand("bold");
    } else if (event.key === "i") {
      event.preventDefault();
      runCommand("italic");
    }
  }

  if (isPlain) {
    return (
      <div className="lesson-markdown-composer">
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-zinc-900">
          {label}
        </label>
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={minRows}
          disabled={disabled}
          spellCheck={false}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
        />
      </div>
    );
  }

  return (
    <div className="glia-write__field">
      <label htmlFor={id} className="glia-write__label">
        {label}
      </label>

      <div className="glia-write__editor">
        <div className="glia-write__editor-bar">
          <div className="glia-write__editor-tools" role="toolbar" aria-label="본문 서식">
            <ToolbarButton label="제목" disabled={busy} onPrepare={saveSelection} onClick={toggleHeading}>
              <Heading2 size={16} strokeWidth={2} />
            </ToolbarButton>
            <ToolbarButton label="굵게" disabled={busy} onPrepare={saveSelection} onClick={() => runCommand("bold")}>
              <Bold size={16} strokeWidth={2} />
            </ToolbarButton>
            <ToolbarButton label="기울임" disabled={busy} onPrepare={saveSelection} onClick={() => runCommand("italic")}>
              <Italic size={16} strokeWidth={2} />
            </ToolbarButton>
            <ToolbarButton
              label="목록"
              disabled={busy}
              onPrepare={saveSelection}
              onClick={() => runCommand("insertUnorderedList")}
            >
              <List size={16} strokeWidth={2} />
            </ToolbarButton>
            <ToolbarButton
              label="인용"
              disabled={busy}
              onPrepare={saveSelection}
              onClick={() => runCommand("formatBlock", "<blockquote>")}
            >
              <Quote size={16} strokeWidth={2} />
            </ToolbarButton>
            <ToolbarButton label="링크" disabled={busy} onPrepare={saveSelection} onClick={applyLink}>
              <LinkIcon size={16} strokeWidth={2} />
            </ToolbarButton>

            {mediaEnabled ? (
              <>
                <span className="glia-write__editor-sep" aria-hidden="true" />
                <ToolbarButton
                  label="사진 첨부"
                  disabled={busy}
                  onPrepare={saveSelection}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImagePlus size={16} strokeWidth={2} />
                </ToolbarButton>
                <ToolbarButton
                  label="영상 첨부"
                  disabled={busy}
                  onPrepare={saveSelection}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video size={16} strokeWidth={2} />
                </ToolbarButton>
              </>
            ) : null}
          </div>
        </div>

        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          contentEditable={!disabled}
          suppressContentEditableWarning
          data-empty={empty ? "true" : "false"}
          data-placeholder={placeholder}
          className="glia-write__visual"
          onInput={emitChange}
          onBlur={emitChange}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onKeyDown={handleKeyDown}
        />
      </div>

      {mediaEnabled ? (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            className="glia-write__file"
            disabled={disabled}
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            multiple
            className="glia-write__file"
            disabled={disabled}
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </>
      ) : null}

      <div className="glia-write__meta">
        <p>
          {hint ??
            (uploading
              ? "올리는 중…"
              : "도구를 누르면 바로 적용됩니다. 사진 10MB · 영상 200MB(mp4·webm·mov).")}
        </p>
        <p>{value.length.toLocaleString("ko-KR")}자</p>
      </div>

      {uploadError ? (
        <p role="alert" className="glia-write__error">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
