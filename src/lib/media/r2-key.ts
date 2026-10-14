import { ApiError } from "@/lib/api";
import { assertLegacyKeyPrefix } from "./r2-config";

/** Namespaces stored outside the media library. Never includes media/. */
export function isLegacyR2Key(key: string) {
  return /^(?:avatars|community|lesson-qna|courses|coaching|products)\//.test(key);
}

export function assertR2ObjectKey(key: string) {
  if (!key || Buffer.byteLength(key, "utf8") > 1024 || key.startsWith("/") ||
      /[\\\u0000-\u001f\u007f]/.test(key) || key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new ApiError("저장 경로가 올바르지 않습니다.", 400, "MEDIA_KEY_REJECTED");
  }
}

/** One explicit namespace mapping; no stripping, existence probing or fallback. */
export function legacyR2ObjectKey(urlKey: string, prefix: string) {
  assertLegacyKeyPrefix(prefix);
  assertR2ObjectKey(urlKey);
  if (!isLegacyR2Key(urlKey)) throw new ApiError("기존 파일 주소가 올바르지 않습니다.", 400, "MEDIA_KEY_REJECTED");
  const objectKey = prefix + urlKey;
  assertR2ObjectKey(objectKey);
  return objectKey;
}
