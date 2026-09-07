import {
  inferLessonMediaContentType,
  lessonMediaKind,
  lessonMediaSizeError,
  LESSON_MEDIA_TYPE_ERROR,
  maxLessonMediaBytes,
} from "@/lib/media/lesson-image-constants";

type UploadLessonMediaParams = {
  file: File;
  courseId: string;
  lessonId: string;
  apiRole: "admin" | "coach";
};

type UploadMediaResponse = {
  publicUrl?: string;
  error?: string;
};

export async function uploadLessonImage(params: UploadLessonMediaParams): Promise<string> {
  return uploadLessonMedia(params);
}

export async function uploadLessonMedia({
  file,
  courseId,
  lessonId,
  apiRole,
}: UploadLessonMediaParams): Promise<string> {
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
  formData.append("courseId", courseId);
  formData.append("lessonId", lessonId);

  const response = await fetch(
    `/${apiRole === "admin" ? "api/admin" : "api/coach"}/media/upload-image`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = (await response.json()) as UploadMediaResponse;
  if (!response.ok || !data.publicUrl) {
    throw new Error(data.error ?? "업로드에 실패했습니다.");
  }

  return data.publicUrl;
}
