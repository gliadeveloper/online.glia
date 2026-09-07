import {
  inferLessonMediaContentType,
  LESSON_MEDIA_TYPE_ERROR,
  lessonMediaKind,
  lessonMediaSizeError,
  maxLessonMediaBytes,
  type LessonMediaKind,
} from "@/lib/media/lesson-image-constants";

type UploadCommunityMediaResponse = {
  publicUrl?: string;
  kind?: LessonMediaKind;
  error?: string;
};

export async function uploadCommunityPostMedia(file: File): Promise<{
  publicUrl: string;
  kind: LessonMediaKind;
}> {
  const contentType = inferLessonMediaContentType(file.name, file.type);
  const kind = lessonMediaKind(contentType);

  if (!kind) {
    throw new Error(LESSON_MEDIA_TYPE_ERROR);
  }

  if (file.size > maxLessonMediaBytes(kind)) {
    throw new Error(lessonMediaSizeError(kind));
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/posts/media", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as UploadCommunityMediaResponse;
  if (!response.ok || !data.publicUrl || !data.kind) {
    throw new Error(data.error ?? "업로드에 실패했습니다.");
  }

  return { publicUrl: data.publicUrl, kind: data.kind };
}
