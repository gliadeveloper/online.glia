import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ApiError } from "@/lib/api";

import { getR2Config } from "./r2-config";

/** Stable URL stored in markdown/blocks — public CDN or authenticated proxy. */
export function buildR2MediaUrl(objectKey: string) {
  const config = getR2Config();
  if (config?.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, "")}/${objectKey}`;
  }
  return `/api/media/r2?key=${encodeURIComponent(objectKey)}`;
}

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

/** Server-side upload — avoids browser CORS to R2 endpoint. */
export async function putR2Object(params: {
  objectKey: string;
  contentType: string;
  body: Buffer | Uint8Array;
}) {
  const config = requireR2Config();
  const client = createR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.objectKey,
      ContentType: params.contentType,
      Body: params.body,
    }),
  );

  return { objectKey: params.objectKey, bucket: config.bucket };
}

function isRangeNotSatisfiable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.$metadata?.httpStatusCode === 416 ||
    candidate.name === "InvalidRange" ||
    candidate.Code === "InvalidRange"
  );
}

/** HTTP Range like `bytes=0-1023` or `bytes=1024-`. Invalid values are ignored. */
export function parseHttpByteRange(header: string | null): string | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (!/^bytes=\d*-\d*$/.test(trimmed) || trimmed === "bytes=-") {
    return undefined;
  }
  return trimmed;
}

export async function getR2Object(objectKey: string, range?: string) {
  const config = requireR2Config();
  const client = createR2Client(config);

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ...(range ? { Range: range } : {}),
      }),
    );

    if (!result.Body) {
      throw new ApiError("Object not found", 404, "NOT_FOUND");
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isRangeNotSatisfiable(error)) {
      throw new ApiError("Requested range not satisfiable", 416, "RANGE_NOT_SATISFIABLE");
    }
    throw error;
  }
}

export async function deleteR2Object(objectKey: string) {
  const config = requireR2Config();
  const client = createR2Client(config);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
  );
}
