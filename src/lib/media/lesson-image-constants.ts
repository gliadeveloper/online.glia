/** Client-safe limits shared by browser upload + API routes. */
export const MAX_LESSON_IMAGE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_LESSON_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
