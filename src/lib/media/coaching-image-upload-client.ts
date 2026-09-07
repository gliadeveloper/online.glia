import {
  inferLessonMediaContentType,
  LESSON_MEDIA_TYPE_ERROR,
  lessonMediaKind,
  lessonMediaSizeError,
  maxLessonMediaBytes,
} from "@/lib/media/lesson-image-constants";

type UploadCoachingMediaParams = {
  file: File;
  sessionId: string;
  apiRole: "admin" | "coach";
};

type UploadMediaResponse = {
  publicUrl?: string;
  error?: string;
};

export async function uploadCoachingImage(params: UploadCoachingMediaParams): Promise<string> {
  return uploadCoachingMedia(params);
}

export async function uploadCoachingMedia({
  file,
  sessionId,
  apiRole,
}: UploadCoachingMediaParams): Promise<string> {
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
  formData.append("sessionId", sessionId);

  const response = await fetch(
    `/${apiRole === "admin" ? "api/admin" : "api/coach"}/media/upload-coaching-image`,
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
