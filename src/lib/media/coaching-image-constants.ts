import {
  MAX_LESSON_IMAGE_BYTES,
  type LessonMediaKind,
} from "@/lib/media/lesson-image-constants";

/** Client-safe limits for coaching session media. Images stay at the lesson limit. */
export const MAX_COACHING_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_COACHING_MEDIA_BYTES = MAX_COACHING_VIDEO_BYTES;

export function coachingMediaSizeError(kind: LessonMediaKind) {
  return kind === "video"
    ? "영상은 500MB 이하만 업로드할 수 있습니다."
    : "이미지는 10MB 이하만 업로드할 수 있습니다.";
}

export function maxCoachingMediaBytes(kind: LessonMediaKind) {
  return kind === "video" ? MAX_COACHING_VIDEO_BYTES : MAX_LESSON_IMAGE_BYTES;
}
