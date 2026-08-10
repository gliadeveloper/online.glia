import { ApiError } from "@/lib/api";
import { MAX_LESSON_IMAGE_BYTES } from "@/lib/media/lesson-image-constants";

export async function parseCoachingImageUploadForm(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!(file instanceof File)) {
    throw new ApiError("file is required", 400, "VALIDATION_ERROR");
  }

  if (!sessionId) {
    throw new ApiError("sessionId is required", 400, "VALIDATION_ERROR");
  }

  if (file.size > MAX_LESSON_IMAGE_BYTES) {
    throw new ApiError("이미지는 10MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  const contentType = file.type.trim() || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    sessionId,
    fileName: file.name || "image",
    contentType,
    buffer,
  };
}
