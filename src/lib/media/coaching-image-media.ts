/** Coaching session body images — auth proxy (same endpoint as lesson images). */

export function buildCoachingImageMediaUrl(objectKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(objectKey)}`;
}

export function parseCoachingImageObjectKey(url: string): string | null {
  try {
    const parsed = url.startsWith("http") ? new URL(url) : new URL(url, "http://localhost");

    if (parsed.pathname === "/api/media/r2") {
      const key = parsed.searchParams.get("key");
      return key?.startsWith("coaching/") ? key : null;
    }

    if (parsed.hostname.endsWith(".r2.dev") && parsed.pathname.startsWith("/coaching/")) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeCoachingImageMediaUrl(url: string) {
  const objectKey = parseCoachingImageObjectKey(url);
  if (!objectKey) return url;
  return buildCoachingImageMediaUrl(objectKey);
}

export function isCoachingImageMediaUrl(url: string) {
  return parseCoachingImageObjectKey(url) !== null;
}
