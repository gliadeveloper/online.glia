export function isZoomUrl(url: string | null | undefined) {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.includes("zoom.us");
  } catch {
    return url.includes("zoom.us");
  }
}

export function getLessonZoomUrl(contents: Array<{ url?: string | null }>) {
  const zoom = contents.find((content) => isZoomUrl(content.url));
  return zoom?.url?.trim() ?? null;
}
