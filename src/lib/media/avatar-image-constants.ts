/** Client-safe limits for profile avatar upload. */
export const MAX_AVATAR_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_AVATAR_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
