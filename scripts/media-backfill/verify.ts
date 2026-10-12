import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { matchesDeclaredSignature, type LibraryMimeType } from "../../src/lib/media/content-signature";
import { verifyMediaContent } from "../../src/lib/media/verify-content";
import type { Entry, VerifiedLegacy } from "./register";

export type LegacyHead = { byteSize: number; etag: string; lastModified: string };
export type LegacyReadStore = {
  head(bucket: string, key: string): Promise<LegacyHead>;
  download(bucket: string, key: string, head: LegacyHead, destination: string): Promise<void>;
};

/** Read-only capability: exact-key HEAD and conditional GET; no writes or deletes. */
export function legacyReadStore(client: S3Client): LegacyReadStore {
  return {
    async head(bucket, key) {
      const r = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(30000) });
      if (!r.ETag || !r.LastModified || !Number.isSafeInteger(r.ContentLength) || r.ContentLength! < 1) throw new Error("BACKFILL_OBJECT_METADATA_INVALID");
      return { byteSize: r.ContentLength!, etag: r.ETag, lastModified: r.LastModified.toISOString() };
    },
    async download(bucket, key, head, destination) {
      const signal = AbortSignal.timeout(10 * 60 * 1000);
      const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, IfMatch: head.etag }), { abortSignal: signal });
      const body = r.Body as Readable | undefined;
      if (!body || typeof body.pipe !== "function") throw new Error("BACKFILL_OBJECT_BODY_INVALID");
      try {
        if (r.ETag !== head.etag || r.ContentLength !== head.byteSize) throw new Error("BACKFILL_OBJECT_CHANGED");
        let seen = 0;
        const limiter = new Transform({ transform(chunk: Buffer, _encoding, done) {
          seen += chunk.length; done(seen > head.byteSize ? new Error("BACKFILL_OBJECT_TOO_LARGE") : null, chunk);
        } });
        await pipeline(body, limiter, createWriteStream(destination, { flags: "wx", mode: 0o600 }), { signal });
        if (seen !== head.byteSize) throw new Error("BACKFILL_OBJECT_TRUNCATED");
      } finally { body.destroy(); }
    },
  };
}

export function assertObservedHead(entry: Entry, head: LegacyHead) {
  // R2 LIST retains milliseconds; HTTP Last-Modified in HEAD has whole seconds.
  // Match that wire precision, while still requiring exact size and ETag.
  const listedAt = Date.parse(entry.observed?.lastModified ?? "");
  const headedAt = Date.parse(head.lastModified);
  if (!entry.observed || String(head.byteSize) !== entry.observed.byteSize || head.etag !== entry.observed.etag ||
      !Number.isFinite(listedAt) || !Number.isFinite(headedAt) ||
      Math.floor(headedAt / 1000) !== Math.floor(listedAt / 1000)) throw new Error("BACKFILL_OBJECT_CHANGED");
}

const mimeByExtension: Record<string, LibraryMimeType> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4",
  wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac", aiff: "audio/aiff", caf: "audio/x-caf",
};

/** Extension chooses the demuxer only. Signature + full decode must both pass.
 * A single restricted transient file is removed on success and handled failure.
 */
export async function verifyLegacyObject(entry: Entry, store: LegacyReadStore, tempRoot: string): Promise<VerifiedLegacy> {
  const mimeType = mimeByExtension[path.extname(entry.objectKey).slice(1).toLowerCase()];
  if (!mimeType) throw new Error("BACKFILL_FORMAT_REVIEW_REQUIRED");
  const head = await store.head(entry.bucket, entry.objectKey);
  assertObservedHead(entry, head);
  if (head.byteSize > 500 * 1024 * 1024) throw new Error("BACKFILL_OBJECT_TOO_LARGE");
  const metadataCheckedAt = new Date();
  const dir = await mkdtemp(path.join(tempRoot, "body-"));
  try {
    const file = path.join(dir, "object");
    await store.download(entry.bucket, entry.objectKey, head, file);
    const handle = await open(file, "r");
    let signature: Buffer;
    try {
      if ((await handle.stat()).size !== head.byteSize) throw new Error("BACKFILL_OBJECT_TRUNCATED");
      signature = Buffer.alloc(32); await handle.read(signature, 0, 32, 0);
    } finally { await handle.close(); }
    if (!matchesDeclaredSignature(mimeType, signature)) throw new Error("BACKFILL_SIGNATURE_MISMATCH");
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    await verifyMediaContent(file, mimeType);
    assertObservedHead(entry, await store.head(entry.bucket, entry.objectKey));
    return { bucket: entry.bucket, objectKey: entry.objectKey, byteSize: head.byteSize, etag: head.etag,
      sha256: hash.digest("hex"), mimeType, metadataCheckedAt, verifiedAt: new Date() };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
