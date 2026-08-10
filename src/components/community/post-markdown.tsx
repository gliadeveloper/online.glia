import Link from "next/link";
import { Children, isValidElement } from "react";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { prepareMarkdownContent, resolveMarkdownHref } from "@/lib/markdown-content";
import { normalizeProxiedR2MediaUrl } from "@/lib/media/proxied-media-url";

type PostMarkdownProps = {
  content: string;
  className?: string;
};

function linkLabel(children: React.ReactNode, href?: string) {
  const text = Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
        return Children.toArray(child.props.children).join("");
      }
      return "";
    })
    .join("")
    .trim();

  if (text) return children;
  return href ?? children;
}

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  const resolved = resolveMarkdownHref(href);
  const label = linkLabel(children, href);

  if (!resolved) {
    return <span>{label}</span>;
  }

  const className =
    "post-markdown__link corp-trust-link font-semibold underline underline-offset-2 hover:opacity-90";

  if (resolved.external) {
    return (
      <a href={resolved.href} className={className} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  return (
    <Link href={resolved.href} className={className}>
      {label}
    </Link>
  );
}

function MarkdownImage({ src, alt }: { src?: string | Blob; alt?: string }) {
  if (!src || typeof src !== "string") return null;

  const resolvedSrc = normalizeProxiedR2MediaUrl(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- lesson R2 proxy URLs
    <img
      src={resolvedSrc}
      alt={alt ?? ""}
      className="my-4 max-w-full rounded-lg"
      loading="lazy"
    />
  );
}

export function PostMarkdown({ content, className = "" }: PostMarkdownProps) {
  const prepared = prepareMarkdownContent(content);

  return (
    <div className={`post-markdown ${className}`.trim()}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
          img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
          pre: ({ children }) => (
            <pre className="post-markdown__pre overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              {children}
            </pre>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = codeClassName?.includes("language-");
            if (isBlock) {
              return <code className={codeClassName}>{children}</code>;
            }
            return (
              <code className="rounded bg-indigo-50 px-1.5 py-0.5 text-[0.9em] font-mono text-indigo-800">
                {children}
              </code>
            );
          },
        }}
      >
        {prepared}
      </Markdown>
    </div>
  );
}
