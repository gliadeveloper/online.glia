import { ApiError } from "@/lib/api";
import {
  COACHING_MEDIA_TYPE_ERROR,
  coachingMediaKind,
  coachingMediaSizeError,
  inferCoachingMediaContentType,
  maxCoachingMediaBytes,
} from "@/lib/media/coaching-image-constants";

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

  const contentType = inferCoachingMediaContentType(file.name, file.type);
  const kind = coachingMediaKind(contentType);

  if (!kind) {
    throw new ApiError(COACHING_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }

  if (file.size > maxCoachingMediaBytes(kind)) {
    throw new ApiError(coachingMediaSizeError(kind), 400, "VALIDATION_ERROR");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    sessionId,
    fileName: file.name || (kind === "video" ? "video" : kind === "audio" ? "audio" : "image"),
    contentType,
    buffer,
  };
}
