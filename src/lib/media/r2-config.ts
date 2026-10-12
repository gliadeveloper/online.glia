import { ApiError } from "@/lib/api";

export type R2Config = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
  region: string;
  legacyKeyPrefix: string;
};

export function assertR2Endpoint(endpoint: string) {
  let parsed: URL;
  try { parsed = new URL(endpoint); } catch { throw invalidConfig(); }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".r2.cloudflarestorage.com") ||
      parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw invalidConfig();
  }
}

export function assertLegacyKeyPrefix(prefix: string) {
  if (prefix && (prefix.length > 200 || !/^(?:[A-Za-z0-9_-]+\/)+$/.test(prefix))) throw invalidConfig();
}

function invalidConfig() {
  return new ApiError("R2 endpoint와 기존 파일 경로 설정을 확인해 주세요.", 503, "R2_CONFIG_INVALID");
}

function readEnv(primary: string, fallback?: string) {
  return process.env[primary]?.trim() || fallback?.trim() || "";
}

export function getR2Config(): R2Config | null {
  const bucket = readEnv("R2_BUCKET");
  const endpoint = readEnv("R2_ENDPOINT");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");
  const publicBaseUrl = readEnv("R2_PUBLIC_BASE_URL") || null;
  const region = readEnv("R2_REGION", "auto") || "auto";
  const legacyKeyPrefix = readEnv("R2_LEGACY_KEY_PREFIX");

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  assertR2Endpoint(endpoint);
  assertLegacyKeyPrefix(legacyKeyPrefix);
  return { bucket, endpoint, accessKeyId, secretAccessKey, publicBaseUrl, region, legacyKeyPrefix };
}

export function isR2Configured() {
  return getR2Config() !== null;
}
