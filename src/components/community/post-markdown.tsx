import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PostMarkdownProps = {
  content: string;
  className?: string;
};

export function PostMarkdown({ content, className = "" }: PostMarkdownProps) {
  return (
    <div className={`post-markdown ${className}`.trim()}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-[var(--color-action-primary)] underline-offset-2 hover:underline"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 typo-subTypography11">
              {children}
            </pre>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = codeClassName?.includes("language-");
            if (isBlock) {
              return <code className={codeClassName}>{children}</code>;
            }
            return (
              <code className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[0.9em] font-mono">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
