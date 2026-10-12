import "server-only";

import { createWriteStream } from "node:fs";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { ApiError } from "@/lib/api";

import { createR2Client, requireR2Config } from "./r2";
import { assertR2LibraryUploadConfig } from "./rollout";

const productionStores = new WeakSet<UploadObjectStore>();

export function assertUploadStoreAllowed(store: UploadObjectStore) {
  if (!store.bucketName || store.bucketName.includes("/") || (store.bucketName === "online-glia" && !productionStores.has(store))) {
    throw new ApiError("검증된 업로드 저장소가 필요합니다.", 503, "R2_BUCKET_NOT_ISOLATED");
  }
}

export type ObjectHead = { byteSize: number; etag: string };

export type UploadObjectStore = {
  bucketName: string;
  presignStagingPut(input: { objectKey: string; contentType: string; byteSize: number; expiresInSeconds: number }): Promise<string>;
  head(objectKey: string): Promise<ObjectHead | null>;
  materialize(input: { objectKey: string; etag: string; maxBytes: number; destPath: string }): Promise<void>;
  putIfAbsent(input: { objectKey: string; contentType: string; sourcePath: string }): Promise<"created" | "exists">;
};

function assertLibraryKey(objectKey: string, kind: "staging" | "final") {
  const staging = objectKey.startsWith("media/staging/");
  const final = objectKey.startsWith("media/shared/") || objectKey.startsWith("media/personal/");
  if (objectKey.includes("..") || (kind === "staging" ? !staging : !final)) {
    throw new ApiError("저장 경로가 올바르지 않습니다.", 500, "MEDIA_KEY_REJECTED");
  }
}

function httpStatus(error: unknown) {
  if (!error || typeof error !== "object") return 0;
  return (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode ?? 0;
}

function limitedBytes(maxBytes: number) {
  let seen = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      seen += buffer.length;
      if (seen > maxBytes) callback(new ApiError("파일이 허용 용량을 초과했습니다.", 413, "MEDIA_TOO_LARGE"));
      else callback(null, buffer);
    },
  });
}

export function createR2UploadStore(): UploadObjectStore {
  const config = requireR2Config();
  assertR2LibraryUploadConfig(config);
  const client = createR2Client(config);

  const store: UploadObjectStore = {
    bucketName: config.bucket,
    async presignStagingPut(input) {
      assertLibraryKey(input.objectKey, "staging");
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.objectKey,
        ContentType: input.contentType,
      });
      // Chrome resets larger PUTs when content-length is part of the signature.
      return getSignedUrl(client, command, {
        expiresIn: input.expiresInSeconds,
        unsignableHeaders: new Set(["content-length"]),
      });
    },
    async head(objectKey) {
      assertLibraryKey(objectKey, objectKey.startsWith("media/staging/") ? "staging" : "final");
      try {
        const result = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        if (result.ContentLength == null || result.ContentLength < 1 || !result.ETag) return null;
        return { byteSize: result.ContentLength, etag: result.ETag };
      } catch (error) {
        if (httpStatus(error) === 404) return null;
        throw new ApiError("저장소 정보를 확인하지 못했습니다.", 503, "UPLOAD_STORAGE_FAILED");
      }
    },
    async materialize(input) {
      assertLibraryKey(input.objectKey, input.objectKey.startsWith("media/staging/") ? "staging" : "final");
      let failure: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await client.send(new GetObjectCommand({
            Bucket: config.bucket,
            Key: input.objectKey,
            IfMatch: input.etag,
          }));
          if (!result.Body || typeof (result.Body as Readable).pipe !== "function") {
            throw new ApiError("저장소에서 파일을 읽지 못했습니다.", 503, "UPLOAD_STORAGE_FAILED");
          }
          await pipeline(result.Body as Readable, limitedBytes(input.maxBytes), createWriteStream(input.destPath, { mode: 0o600 }));
          return;
        } catch (error) {
          if (error instanceof ApiError && error.code !== "UPLOAD_STORAGE_FAILED") throw error;
          if (httpStatus(error) === 412) throw new ApiError("검증한 파일 내용이 바뀌었습니다.", 409, "STAGING_CHANGED");
          if (httpStatus(error) === 404) throw new ApiError("업로드된 파일을 찾지 못했습니다.", 409, "MEDIA_STAGING_ABSENT");
          failure = error;
        }
      }
      if (failure instanceof ApiError) throw failure;
      throw new ApiError("저장소에서 파일을 읽지 못했습니다.", 503, "UPLOAD_STORAGE_FAILED");
    },
    async putIfAbsent(input) {
      assertLibraryKey(input.objectKey, "final");
      const { createReadStream } = await import("node:fs");
      let failure: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const body = createReadStream(input.sourcePath);
        try {
          await client.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: input.objectKey,
            ContentType: input.contentType,
            Body: body,
            IfNoneMatch: "*",
          }));
          return "created";
        } catch (error) {
          if (httpStatus(error) === 412) return "exists";
          failure = error;
        } finally {
          body.destroy();
        }
      }
      if (failure instanceof ApiError) throw failure;
      throw new ApiError("최종 파일을 확인하지 못했습니다.", 503, "UPLOAD_RESULT_UNKNOWN");
    },
  };
  if (config.bucket === "online-glia") productionStores.add(store);
  return store;
}
