/** Lesson body images — always served via auth proxy, not R2_PUBLIC_BASE_URL. */

export function buildLessonImageMediaUrl(objectKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(objectKey)}`;
}

/** Extract R2 object key from proxy URL or *.r2.dev public URL. */
export function parseLessonImageObjectKey(url: string): string | null {
  try {
    const parsed = url.startsWith("http") ? new URL(url) : new URL(url, "http://localhost");

    if (parsed.pathname === "/api/media/r2") {
      return parsed.searchParams.get("key");
    }

    if (parsed.hostname.endsWith(".r2.dev") && parsed.pathname.startsWith("/courses/")) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeLessonImageMediaUrl(url: string) {
  const objectKey = parseLessonImageObjectKey(url);
  if (!objectKey) return url;
  return buildLessonImageMediaUrl(objectKey);
}

export function isLessonImageMediaUrl(url: string) {
  return parseLessonImageObjectKey(url) !== null;
}
