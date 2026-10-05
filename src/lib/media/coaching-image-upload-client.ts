import {
  COACHING_MEDIA_TYPE_ERROR,
  coachingMediaKind,
  coachingMediaSizeError,
  inferCoachingMediaContentType,
  maxCoachingMediaBytes,
} from "@/lib/media/coaching-image-constants";

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
  const contentType = inferCoachingMediaContentType(file.name, file.type);
  const kind = coachingMediaKind(contentType);

  if (!kind) {
    throw new Error(COACHING_MEDIA_TYPE_ERROR);
  }

  if (file.size > maxCoachingMediaBytes(kind)) {
    throw new Error(coachingMediaSizeError(kind));
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
