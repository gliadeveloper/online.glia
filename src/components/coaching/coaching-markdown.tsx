type CoachingMarkdownProps = {
  content: string;
};

export function CoachingMarkdown({ content }: CoachingMarkdownProps) {
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-sm">
      <div className="prose prose-sm max-w-none text-[var(--color-text-primary)] prose-headings:text-[var(--color-text-primary)] prose-p:text-[var(--color-text-secondary)] prose-strong:text-[var(--color-text-primary)] prose-li:text-[var(--color-text-secondary)]">
        <pre className="whitespace-pre-wrap font-sans typo-subTypography11 leading-relaxed">{content}</pre>
      </div>
    </article>
  );
}
