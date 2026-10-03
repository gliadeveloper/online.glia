import {
  inferLessonMediaContentType,
  lessonMediaKind,
  MAX_LESSON_IMAGE_BYTES,
  type LessonMediaKind,
} from "@/lib/media/lesson-image-constants";

/** Client-safe limits for coaching session media. Images stay at the lesson limit. */
export const MAX_COACHING_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_COACHING_AUDIO_BYTES = 200 * 1024 * 1024;

export type CoachingMediaKind = LessonMediaKind | "audio";

const COACHING_AUDIO_MIME_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-aac": "audio/aac",
};

const COACHING_AUDIO_EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  m4a: "audio/mp4",
  mp4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  wave: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  caf: "audio/x-caf",
};

export const COACHING_MEDIA_TYPE_ERROR =
  "이미지나 영상(mp4, webm, mov), 오디오(mp3, m4a, wav, aac, ogg)만 업로드할 수 있습니다.";

export function coachingMediaSizeError(kind: CoachingMediaKind) {
  if (kind === "video") return "영상은 500MB 이하만 업로드할 수 있습니다.";
  if (kind === "audio") return "오디오는 200MB 이하만 업로드할 수 있습니다.";
  return "이미지는 10MB 이하만 업로드할 수 있습니다.";
}

function fileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function inferCoachingMediaContentType(fileName: string, declaredType: string) {
  const declared = declaredType.trim().toLowerCase();
  if (declared.startsWith("audio/")) {
    return COACHING_AUDIO_MIME_ALIASES[declared] ?? declared;
  }

  const audioMime = COACHING_AUDIO_EXT_TO_MIME[fileExtension(fileName)];
  if (audioMime && (!declared || declared === "application/octet-stream")) {
    return audioMime;
  }

  return inferLessonMediaContentType(fileName, declaredType);
}

export function coachingMediaKind(contentType: string): CoachingMediaKind | null {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.startsWith("audio/")) return "audio";
  return lessonMediaKind(normalized);
}

export function maxCoachingMediaBytes(kind: CoachingMediaKind) {
  if (kind === "video") return MAX_COACHING_VIDEO_BYTES;
  if (kind === "audio") return MAX_COACHING_AUDIO_BYTES;
  return MAX_LESSON_IMAGE_BYTES;
}
