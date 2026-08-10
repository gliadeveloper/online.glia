import {
  isCoachingImageMediaUrl,
  normalizeCoachingImageMediaUrl,
} from "@/lib/media/coaching-image-media";
import {
  isLessonImageMediaUrl,
  normalizeLessonImageMediaUrl,
} from "@/lib/media/lesson-image-media";

/** R2 proxy URLs (lesson + coaching body images). */
export function isProxiedR2MediaUrl(url: string) {
  return isLessonImageMediaUrl(url) || isCoachingImageMediaUrl(url);
}

export function normalizeProxiedR2MediaUrl(url: string) {
  if (isCoachingImageMediaUrl(url)) {
    return normalizeCoachingImageMediaUrl(url);
  }
  return normalizeLessonImageMediaUrl(url);
}

export async function resolveProxiedMediaUrl(url: string) {
  const proxyUrl = normalizeProxiedR2MediaUrl(url);
  const response = await fetch(proxyUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error("미디어를 불러오지 못했습니다.");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
