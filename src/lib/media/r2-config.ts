export type R2Config = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
  region: string;
};

function readEnv(primary: string, fallback?: string) {
  return process.env[primary]?.trim() || fallback?.trim() || "";
}

export function getR2Config(): R2Config | null {
  const bucket = readEnv("R2_BUCKET", process.env.LIVEKIT_EGRESS_S3_BUCKET);
  const endpoint = readEnv("R2_ENDPOINT", process.env.LIVEKIT_EGRESS_S3_ENDPOINT);
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID", process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY);
  const secretAccessKey = readEnv(
    "R2_SECRET_ACCESS_KEY",
    process.env.LIVEKIT_EGRESS_S3_SECRET,
  );
  const publicBaseUrl =
    readEnv("R2_PUBLIC_BASE_URL", process.env.LIVEKIT_EGRESS_PUBLIC_BASE_URL) || null;
  const region = readEnv("R2_REGION", "auto") || "auto";

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { bucket, endpoint, accessKeyId, secretAccessKey, publicBaseUrl, region };
}

export function isR2Configured() {
  return getR2Config() !== null;
}
