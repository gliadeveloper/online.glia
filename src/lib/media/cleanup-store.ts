import "server-only";
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Deliberately separate from upload HEAD: a zero-byte object is still present. */
export type CleanupObjectStore = {
  bucketName: string;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
};

export function assertIsolatedCleanupBucket(bucket: string) {
  if (!/^[a-z0-9][a-z0-9-]*-(dev|test)$/.test(bucket)) throw new Error("CLEANUP_BUCKET_NOT_ISOLATED");
}

export function createCleanupStore(config: { bucket: string; endpoint: string; accessKeyId: string; secretAccessKey: string }) {
  assertIsolatedCleanupBucket(config.bucket);
  const endpoint = new URL(config.endpoint);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".r2.cloudflarestorage.com") || endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash) throw new Error("CLEANUP_ENDPOINT_INVALID");
  const client = new S3Client({
    region: "auto", endpoint: config.endpoint, forcePathStyle: true, maxAttempts: 3,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestHandler: { connectionTimeout: 10000, requestTimeout: 30000 },
  });
  const assertKey = (key: string) => {
    if (!/^media\/(staging|shared|personal)\/[a-zA-Z0-9_./-]+$/.test(key) || key.includes("..")) throw new Error("CLEANUP_KEY_REJECTED");
  };
  const store: CleanupObjectStore = {
    bucketName: config.bucket,
    async remove(key) {
      assertKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(45000) });
    },
    async exists(key) {
      assertKey(key);
      try {
        await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(45000) });
        return true;
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
        throw error;
      }
    },
  };
  return { store, close: () => client.destroy() };
}
