const MARKDOWN_STRIP_RE =
  /```[\s\S]*?```|`[^`]+`|\[([^\]]+)\]\([^)]+\)|[#>*_~\-]+/g;

const MARKDOWN_IMAGE_RE = /!\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const MARKDOWN_VIDEO_URL_RE = /(?:\/videos\/|\.(?:mp4|webm|mov|m4v)(?:$|[?#]))/i;

export function isMarkdownVideoUrl(url: string) {
  try {
    const parsed = url.startsWith("http") ? new URL(url) : new URL(url, "http://localhost");
    const key = parsed.searchParams.get("key") ?? parsed.pathname;
    return MARKDOWN_VIDEO_URL_RE.test(decodeURIComponent(key));
  } catch {
    return MARKDOWN_VIDEO_URL_RE.test(url);
  }
}

export function firstMarkdownImage(markdown: string): string | null {
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const url = match[1];
    if (url && !isMarkdownVideoUrl(url)) {
      return url;
    }
  }

  return null;
}

export function excerptFromMarkdown(markdown: string, maxLength = 160): string {
  const plain = markdown
    .replace(MARKDOWN_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

export function formatPostDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatPostDateTime(date: Date): string {
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPostRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "방금 전";
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}일 전`;
  }

  return formatPostDate(date);
}
