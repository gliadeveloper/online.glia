import { ApiError } from "@/lib/api";
import {
  coachingMediaSizeError,
  MAX_COACHING_MEDIA_BYTES,
  maxCoachingMediaBytes,
} from "@/lib/media/coaching-image-constants";
import {
  inferLessonMediaContentType,
  lessonMediaKind,
  LESSON_MEDIA_TYPE_ERROR,
} from "@/lib/media/lesson-image-constants";

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

  if (file.size > MAX_COACHING_MEDIA_BYTES) {
    throw new ApiError(coachingMediaSizeError("video"), 400, "VALIDATION_ERROR");
  }

  const contentType = inferLessonMediaContentType(file.name, file.type);
  const kind = lessonMediaKind(contentType);

  if (!kind) {
    throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }

  if (file.size > maxCoachingMediaBytes(kind)) {
    throw new ApiError(coachingMediaSizeError(kind), 400, "VALIDATION_ERROR");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    sessionId,
    fileName: file.name || (kind === "video" ? "video" : "image"),
    contentType,
    buffer,
  };
}
