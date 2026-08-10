import type { Prisma } from "@/generated/prisma/client";

export type ContentMetadata = Record<string, unknown>;

export function parseContentMetadata(value: Prisma.JsonValue | null | undefined): ContentMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as ContentMetadata;
}

export function buildLessonImageObjectKey(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `courses/${params.courseId}/lessons/${params.lessonId}/images/${Date.now()}-${safeName}`;
}

export function buildCoachingImageObjectKey(params: {
  sessionId: string;
  fileName: string;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `coaching/${params.sessionId}/images/${Date.now()}-${safeName}`;
}

export function parseCoachingMediaObjectKey(objectKey: string): {
  sessionId: string;
} | null {
  const match = objectKey.match(/^coaching\/([^/]+)\//);
  if (!match) return null;
  return { sessionId: match[1] };
}

export function parseCourseMediaObjectKey(objectKey: string): {
  courseId: string;
  lessonId: string;
} | null {
  const match = objectKey.match(/^courses\/([^/]+)\/lessons\/([^/]+)\//);
  if (!match) return null;
  return { courseId: match[1], lessonId: match[2] };
}
