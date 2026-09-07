import { ApiError } from "@/lib/api";
import {
  inferLessonMediaContentType,
  lessonMediaKind,
  lessonMediaSizeError,
  LESSON_MEDIA_TYPE_ERROR,
  MAX_LESSON_MEDIA_BYTES,
  maxLessonMediaBytes,
} from "@/lib/media/lesson-image-constants";

export async function parseLessonImageUploadForm(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const courseId = String(formData.get("courseId") ?? "").trim();
  const lessonId = String(formData.get("lessonId") ?? "").trim();

  if (!(file instanceof File)) {
    throw new ApiError("file is required", 400, "VALIDATION_ERROR");
  }

  if (!courseId || !lessonId) {
    throw new ApiError("courseId and lessonId are required", 400, "VALIDATION_ERROR");
  }

  if (file.size > MAX_LESSON_MEDIA_BYTES) {
    throw new ApiError(lessonMediaSizeError("video"), 400, "VALIDATION_ERROR");
  }

  const contentType = inferLessonMediaContentType(file.name, file.type);
  const kind = lessonMediaKind(contentType);

  if (!kind) {
    throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }

  if (file.size > maxLessonMediaBytes(kind)) {
    throw new ApiError(lessonMediaSizeError(kind), 400, "VALIDATION_ERROR");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    courseId,
    lessonId,
    fileName: file.name || (kind === "video" ? "video" : "image"),
    contentType,
    buffer,
  };
}
