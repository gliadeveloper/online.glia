/** Normalize watch/share URLs to YouTube embed iframe src. */
export function toYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (!parsed.hostname.includes("youtube.com")) {
      return null;
    }

    if (parsed.pathname.startsWith("/embed/")) {
      return url;
    }

    const videoId = parsed.searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch?.[1]) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

export function isYoutubeUrl(url: string): boolean {
  return toYoutubeEmbedUrl(url) !== null;
}

export function getLessonYoutubeUrl(
  contents: Array<{ type?: string; url?: string | null }>,
) {
  const video = contents.find(
    (content) => content.type === "VIDEO" && isYoutubeUrl(content.url ?? ""),
  );
  return video?.url?.trim() ?? null;
}
