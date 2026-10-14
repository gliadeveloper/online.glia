import { ApiError } from "@/lib/api";

import {
  ALLOWED_LESSON_IMAGE_TYPES,
  inferLessonMediaContentType,
  MAX_LESSON_IMAGE_BYTES,
} from "./lesson-image-constants";
import { putR2Object, requireR2Config } from "./r2";

export const PRODUCT_IMAGE_TYPE_ERROR =
  "jpeg, png, webp, gif, avif 이미지만 업로드할 수 있습니다.";
export const PRODUCT_IMAGE_SIZE_ERROR = "이미지는 10MB 이하만 업로드할 수 있습니다.";

function safeImageFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
}

export function buildProductImageObjectKey(params: { productId: string; fileName: string }) {
  const productId = params.productId.trim();
  if (!/^[\w-]+$/.test(productId)) {
    throw new ApiError("상품 정보가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  return `products/${productId}/images/${Date.now()}-${safeImageFileName(params.fileName)}`;
}

/** Catalog images on a product detail page. Not a media-library asset. */
export function parseProductImageObjectKey(objectKey: string): { productId: string } | null {
  const match = objectKey.match(/^products\/([\w-]+)\/images\/[^/]+$/);
  if (!match) return null;
  return { productId: match[1] };
}

export function buildProductImageMediaUrl(objectKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(objectKey)}`;
}

export function assertProductImageUpload(params: { fileName: string; contentType: string; byteLength: number }) {
  if (params.byteLength > MAX_LESSON_IMAGE_BYTES) {
    throw new ApiError(PRODUCT_IMAGE_SIZE_ERROR, 400, "VALIDATION_ERROR");
  }
  const contentType = inferLessonMediaContentType(params.fileName, params.contentType);
  if (!ALLOWED_LESSON_IMAGE_TYPES.has(contentType)) {
    throw new ApiError(PRODUCT_IMAGE_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }
  return contentType;
}

export async function readProductImageUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ApiError("파일을 선택해 주세요.", 400, "VALIDATION_ERROR");
  }
  const contentType = assertProductImageUpload({
    fileName: file.name || "image",
    contentType: file.type,
    byteLength: file.size,
  });
  return {
    fileName: file.name || "image",
    contentType,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

export async function uploadProductDescriptionImageBuffer(params: {
  productId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const contentType = assertProductImageUpload({
    fileName: params.fileName,
    contentType: params.contentType,
    byteLength: params.buffer.byteLength,
  });
  requireR2Config();
  const objectKey = buildProductImageObjectKey({
    productId: params.productId,
    fileName: params.fileName,
  });
  await putR2Object({
    objectKey,
    contentType,
    body: params.buffer,
  });
  return {
    objectKey,
    publicUrl: buildProductImageMediaUrl(objectKey),
  };
}
