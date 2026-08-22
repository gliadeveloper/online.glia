"use client";

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
  variant = "glia",
}: MarkdownComposerProps) {
  const isPlain = variant === "plain";

  return (
    <div className={isPlain ? "lesson-markdown-composer" : "glia-write__field"}>
      <label
        htmlFor={id}
        className={
          isPlain ? "mb-2 block text-sm font-medium text-zinc-900" : "glia-write__label"
        }
      >
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
        className={
          isPlain
            ? "w-full rounded-xl border border-zinc-200 px-4 py-3 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
            : "glia-write__textarea"
        }
      />

      <div
        className={
          isPlain
            ? "mt-2 flex items-center justify-between text-xs text-zinc-500"
            : "glia-write__meta"
        }
      >
        <p>{hint ?? "굵게, 목록, 코드 블록, 표(GFM)를 지원합니다."}</p>
        <p>{value.length.toLocaleString("ko-KR")}자</p>
      </div>
    </div>
  );
}
