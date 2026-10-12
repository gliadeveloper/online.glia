import "server-only";
import { ApiError } from "@/lib/api";
import { getR2Config, type R2Config } from "./r2-config";

type Role = "admin" | "coach";
type Env = Record<string, string | undefined>;

/** Runtime flags are deliberately server-only; absent or misspelled values close the feature. */
export function mediaLibraryEnabled(role: Role, env: Env = process.env) {
  return env.MEDIA_LIBRARY_ROLLOUT === "all" || (env.MEDIA_LIBRARY_ROLLOUT === "admin" && role === "admin");
}

export function assertMediaLibraryEnabled(role: Role) {
  if (!mediaLibraryEnabled(role)) throw new ApiError("자료 보관함을 아직 사용할 수 없습니다.", 503, "MEDIA_LIBRARY_DISABLED");
}

export function assertMediaUploadsEnabled(role: Role) {
  assertMediaLibraryEnabled(role);
  if (process.env.MEDIA_LIBRARY_UPLOADS !== "enabled") throw new ApiError("새 자료 업로드가 일시 중지되었습니다.", 503, "MEDIA_UPLOADS_DISABLED");
}

/** This is an explicit deployment binding, not an IAM or bucket-privacy check. */
export function assertR2LibraryUploadConfig(config: R2Config, env: Env = process.env) {
  if (config.bucket !== "online-glia") return;
  const target = `${new URL(config.endpoint).origin}/${config.bucket}`;
  if (env.NODE_ENV !== "production" || env.MEDIA_R2_PRODUCTION_TARGET !== target ||
      config.legacyKeyPrefix !== "online-glia/" || config.publicBaseUrl) {
    throw new ApiError("운영 미디어 업로드 설정을 확인해 주세요.", 503, "R2_BUCKET_NOT_ISOLATED");
  }
}

export function mediaLibraryCapabilities(role: Role) {
  const libraryEnabled = mediaLibraryEnabled(role);
  let uploadEnabled = false;
  if (libraryEnabled && process.env.MEDIA_LIBRARY_UPLOADS === "enabled") {
    try {
      const config = getR2Config();
      if (config) { assertR2LibraryUploadConfig(config); uploadEnabled = true; }
    } catch { /* A configuration error never enables a legacy-upload fallback. */ }
  }
  return { libraryEnabled, uploadEnabled };
}
