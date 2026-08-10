import { ApiError } from "@/lib/api";
import { MAX_LESSON_IMAGE_BYTES } from "@/lib/media/lesson-image-constants";

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

  if (file.size > MAX_LESSON_IMAGE_BYTES) {
    throw new ApiError("이미지는 10MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  const contentType = file.type.trim() || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    courseId,
    lessonId,
    fileName: file.name || "image",
    contentType,
    buffer,
  };
}
