import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ApiError } from "@/lib/api";

import { getR2Config } from "./r2-config";

function createR2Client(config: NonNullable<ReturnType<typeof getR2Config>>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export function requireR2Config() {
  const config = getR2Config();
  if (!config) {
    throw new ApiError("R2 storage is not configured", 503, "R2_NOT_CONFIGURED");
  }
  return config;
}

export async function createR2UploadPresignedUrl(params: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const config = requireR2Config();
  const client = createR2Client(config);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: params.objectKey,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 3600,
  });

  return { uploadUrl, objectKey: params.objectKey, bucket: config.bucket };
}

export async function createR2PlaybackUrl(objectKey: string) {
  const config = requireR2Config();

  if (config.publicBaseUrl) {
    const base = config.publicBaseUrl.replace(/\/$/, "");
    return `${base}/${objectKey}`;
  }

  const client = createR2Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}
