import { MAX_LESSON_IMAGE_BYTES } from "@/lib/media/lesson-image-constants";

type UploadCoachingImageParams = {
  file: File;
  sessionId: string;
  apiRole: "admin" | "coach";
};

type UploadImageResponse = {
  publicUrl?: string;
  error?: string;
};

export async function uploadCoachingImage({
  file,
  sessionId,
  apiRole,
}: UploadCoachingImageParams): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_LESSON_IMAGE_BYTES) {
    throw new Error("이미지는 10MB 이하만 업로드할 수 있습니다.");
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

  const data = (await response.json()) as UploadImageResponse;
  if (!response.ok || !data.publicUrl) {
    throw new Error(data.error ?? "이미지 업로드에 실패했습니다.");
  }

  return data.publicUrl;
}
