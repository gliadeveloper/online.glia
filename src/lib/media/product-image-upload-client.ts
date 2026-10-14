import {
  ALLOWED_LESSON_IMAGE_TYPES,
  inferLessonMediaContentType,
  MAX_LESSON_IMAGE_BYTES,
} from "@/lib/media/lesson-image-constants";

type UploadProductImageParams = {
  file: File;
  productId: string;
  apiRole: "admin" | "coach";
};

type UploadProductImageResponse = {
  publicUrl?: string;
  error?: string;
};

export async function uploadProductDescriptionImage({
  file,
  productId,
  apiRole,
}: UploadProductImageParams): Promise<string> {
  const contentType = inferLessonMediaContentType(file.name, file.type);
  if (!ALLOWED_LESSON_IMAGE_TYPES.has(contentType)) {
    throw new Error("jpeg, png, webp, gif, avif 이미지만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_LESSON_IMAGE_BYTES) {
    throw new Error("이미지는 10MB 이하만 업로드할 수 있습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/${apiRole}/products/${productId}/description-image`, {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as UploadProductImageResponse;
  if (!response.ok || !data.publicUrl) {
    throw new Error(data.error ?? "업로드에 실패했습니다.");
  }
  return data.publicUrl;
}
