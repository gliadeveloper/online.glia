/** Client-safe limits shared by browser upload + API routes. */
export const MAX_LESSON_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_LESSON_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_LESSON_MEDIA_BYTES = MAX_LESSON_VIDEO_BYTES;

export const ALLOWED_LESSON_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const ALLOWED_LESSON_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const LESSON_IMAGE_EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const LESSON_VIDEO_EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export type LessonMediaKind = "image" | "video";

export const LESSON_MEDIA_TYPE_ERROR =
  "이미지나 영상(mp4, webm, mov)만 업로드할 수 있습니다.";

export function lessonMediaSizeError(kind: LessonMediaKind) {
  return kind === "video"
    ? "영상은 200MB 이하만 업로드할 수 있습니다."
    : "이미지는 10MB 이하만 업로드할 수 있습니다.";
}

function fileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function inferLessonMediaContentType(fileName: string, declaredType: string) {
  const declared = declaredType.trim().toLowerCase();
  if (declared && declared !== "application/octet-stream") {
    return declared;
  }

  const ext = fileExtension(fileName);
  return (
    LESSON_VIDEO_EXT_TO_MIME[ext] ??
    LESSON_IMAGE_EXT_TO_MIME[ext] ??
    (declared || "application/octet-stream")
  );
}

export function lessonMediaKind(contentType: string): LessonMediaKind | null {
  const normalized = contentType.trim().toLowerCase();
  if (ALLOWED_LESSON_IMAGE_TYPES.has(normalized)) return "image";
  if (ALLOWED_LESSON_VIDEO_TYPES.has(normalized)) return "video";
  return null;
}

export function maxLessonMediaBytes(kind: LessonMediaKind) {
  return kind === "video" ? MAX_LESSON_VIDEO_BYTES : MAX_LESSON_IMAGE_BYTES;
}
