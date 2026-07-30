"use client";

import { useState } from "react";

import { PostMarkdown } from "@/components/community/post-markdown";

type MarkdownComposerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  hint?: string;
  disabled?: boolean;
};

export function MarkdownComposer({
  id,
  label,
  value,
  onChange,
  placeholder = "Markdown으로 작성하세요…",
  minRows = 10,
  hint,
  disabled = false,
}: MarkdownComposerProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor={id} className="typo-subTypography11 font-semibold text-[var(--color-text-primary)]">
          {label}
        </label>
        <div
          role="tablist"
          aria-label={`${label} 모드`}
          className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-0.5"
        >
          <ComposerTab
            active={mode === "write"}
            onClick={() => setMode("write")}
            label="작성"
          />
          <ComposerTab
            active={mode === "preview"}
            onClick={() => setMode("preview")}
            label="미리보기"
          />
        </div>
      </div>

      {mode === "write" ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={minRows}
          disabled={disabled}
          className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono typo-subTypography11 leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] shell-focus-ring disabled:opacity-60"
        />
      ) : (
        <div className="min-h-[12rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4">
          {value.trim() ? (
            <PostMarkdown content={value} />
          ) : (
            <p className="typo-subTypography11 text-[var(--color-text-disabled)]">미리볼 내용이 없습니다.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 typo-subTypography12 text-[var(--color-text-secondary)]">
        <p>{hint ?? "굵게, 목록, 코드 블록, 표(GFM)를 지원합니다."}</p>
        <p>{value.length.toLocaleString("ko-KR")}자</p>
      </div>
    </div>
  );
}

function ComposerTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shell-focus-ring min-h-9 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 typo-subTypography12 font-medium transition ${
        active
          ? "bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-sm"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}
