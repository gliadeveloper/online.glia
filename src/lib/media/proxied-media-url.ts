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
