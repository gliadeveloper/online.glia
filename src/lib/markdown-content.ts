const APP_PATH_PREFIX =
  /^\/(?:community|learning|shop|checkin|mypage|orders|coaching)(?:\/[^\s)\]>]+)?$/i;

/** Legacy HTML lesson bodies → markdown-friendly plain text before render. */
export function htmlToMarkdownText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function autolinkRelativePaths(text: string): string {
  return text.replace(
    /(^|[\s(])((\/(?:community|learning|shop|checkin|mypage|orders|coaching)(?:\/[^\s)\]>]+)?))/gi,
    (match, prefix, path) => {
      if (prefix.endsWith("](")) return match;
      return `${prefix}[${path}](${path})`;
    },
  );
}

/** `[](url)` → `[url](url)` — md-editor link toolbar creates empty labels for URLs. */
export function fixEmptyMarkdownLinks(text: string): string {
  return text.replace(/\[\]\(([^)\s]+)\)/g, (_, url: string) => `[${url}](${url})`);
}

/** GFM bold/italic break when `** text**` — normalize legacy lossy exports. */
function fixBrokenEmphasisMarkdown(text: string): string {
  return text
    .replace(/\*\*\s+([^*\n]+?)\*\*/g, "**$1**")
    .replace(/(?<!\*)\*\s+([^*\n]+?)\*(?!\*)/g, "*$1*");
}

/** `[url](url)` → plain `url` — GFM autolink + preview behave more reliably than redundant links. */
function collapseRedundantMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(\1\)/g, "$1");
}

/** Same-origin app URLs → relative paths (env-agnostic drafts). */
export function normalizeAppUrlForDraft(text: string): string {
  const value = text.trim();
  if (!value) return value;

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

      if (isLocalHost && APP_PATH_PREFIX.test(url.pathname)) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    }
  } catch {
    // keep original value
  }

  return value;
}

function normalizeAppUrlsInDraft(text: string): string {
  return text.replace(
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/(?:community|learning|shop|checkin|mypage|orders|coaching)(?:\/[^\s)\]>]+)?)/gi,
    "$1",
  );
}

/** Normalize markdown/HTML before react-markdown render. */
export function prepareMarkdownContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  let text = /<[a-z][\s\S]*>/i.test(trimmed) ? htmlToMarkdownText(trimmed) : trimmed;
  text = fixEmptyMarkdownLinks(text);
  text = fixBrokenEmphasisMarkdown(text);
  text = collapseRedundantMarkdownLinks(text);
  text = normalizeAppUrlsInDraft(text);
  text = autolinkRelativePaths(text);
  return text;
}

/** Editor save/onChange normalization. */
export function normalizeMarkdownDraft(content: string): string {
  let text = fixEmptyMarkdownLinks(content);
  text = collapseRedundantMarkdownLinks(text);
  text = normalizeAppUrlsInDraft(text);
  return text;
}

export type ResolvedMarkdownHref = {
  href: string;
  external: boolean;
};

/** Same-origin app paths use client navigation; external URLs open in a new tab. */
export function resolveMarkdownHref(rawHref: string | undefined): ResolvedMarkdownHref | null {
  if (!rawHref) return null;

  try {
    if (rawHref.startsWith("/")) {
      return { href: rawHref, external: false };
    }

    const url = new URL(rawHref);
    const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (isLocalHost && APP_PATH_PREFIX.test(url.pathname)) {
      return { href: `${url.pathname}${url.search}${url.hash}`, external: false };
    }

    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return { href: rawHref, external: url.protocol !== "mailto:" };
    }
  } catch {
    if (APP_PATH_PREFIX.test(rawHref)) {
      return { href: rawHref, external: false };
    }
  }

  return null;
}
