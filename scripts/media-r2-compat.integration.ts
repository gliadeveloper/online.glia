import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ApiError } from "../src/lib/api";
import { getR2Config } from "../src/lib/media/r2-config";
import { legacyR2ObjectKey } from "../src/lib/media/r2-key";
import { buildR2MediaUrl, createR2Client, createR2UploadPresignedUrl, deleteR2Object, getR2Object, getR2StoredObject, headR2StoredObject, putR2Object, requireR2Config } from "../src/lib/media/r2";
import { createR2UploadStore } from "../src/lib/media/r2-upload-store";
import { createMediaGetHandler } from "../src/lib/media/media-delivery";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const code = (value: string) => (error: unknown) => error instanceof ApiError && error.code === value;

/** No network: SDK signing is real; send() captures commands with fixture credentials. */
export async function runR2CompatibilityIntegration(check: Check) {
  const env = {
    R2_BUCKET: "compat-test", R2_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
    R2_ACCESS_KEY_ID: "fixture-key", R2_SECRET_ACCESS_KEY: "fixture-secret",
    R2_LEGACY_KEY_PREFIX: "old-bucket/", R2_PUBLIC_BASE_URL: "https://media.example.invalid",
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const send = S3Client.prototype.send;
  const commands: { type: string; key: string; bucket: string; range?: string; conditional?: string }[] = [];
  const dir = await mkdtemp(path.join(os.tmpdir(), "media-r2-compat-"));
  try {
    Object.assign(process.env, env);
    S3Client.prototype.send = (async function (command: { constructor: { name: string }; input: { Key: string; Bucket: string; Range?: string; IfNoneMatch?: string } }) {
      commands.push({ type: command.constructor.name, key: command.input.Key, bucket: command.input.Bucket, range: command.input.Range, conditional: command.input.IfNoneMatch });
      if (command instanceof HeadObjectCommand) return { ContentLength: 10, ContentType: "image/png", ETag: '"fixture"' };
      if (command instanceof GetObjectCommand) return { ContentLength: 10, Body: {
        transformToByteArray: async () => new Uint8Array(Buffer.from("0123456789")),
        transformToWebStream: () => new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(Buffer.from("0123456789"))); controller.close(); } }),
      } };
      return {};
    }) as typeof send;

    await check("R2 compatibility: endpoint bucket paths and unsafe explicit prefixes fail closed", async () => {
      const normal = requireR2Config();
      assert.equal(normal.legacyKeyPrefix, "old-bucket/");
      for (const suffix of ["/compat-test", "/compat-test/", "?bucket=compat-test", "#fragment"]) {
        process.env.R2_ENDPOINT = env.R2_ENDPOINT + suffix;
        assert.throws(getR2Config, code("R2_CONFIG_INVALID"));
      }
      process.env.R2_ENDPOINT = env.R2_ENDPOINT;
      for (const prefix of ["../", "/old/", "old", "old//", "a/../", "a?b/"]) {
        process.env.R2_LEGACY_KEY_PREFIX = prefix;
        assert.throws(getR2Config, code("R2_CONFIG_INVALID"));
      }
      process.env.R2_LEGACY_KEY_PREFIX = env.R2_LEGACY_KEY_PREFIX;
      assert.throws(() => createR2Client({ ...normal, endpoint: normal.endpoint + "/compat-test" }), code("R2_CONFIG_INVALID"));
    });

    await check("R2 compatibility: legacy upload, download, deletion and signing target one exact prefix", async () => {
      for (const key of ["avatars/u/image.png", "community/u/videos/movie.mp4", "lesson-qna/c/u/image.png", "courses/c/lessons/l/materials/file.pdf", "coaching/s/audio/file.mp3"]) {
        commands.length = 0;
        const saved = await putR2Object({ objectKey: key, contentType: "application/octet-stream", body: Buffer.from("fixture") });
        assert.equal(saved.objectKey, key, "DB/URL remains logical");
        await getR2Object(key, "bytes=1-3");
        await deleteR2Object(key);
        assert.deepEqual(commands.map(c => c.type), ["PutObjectCommand", "GetObjectCommand", "DeleteObjectCommand"]);
        assert(commands.every(c => c.key === "old-bucket/" + key && c.bucket === "compat-test"));
        assert.equal(commands[1].range, "bytes=1-3");
        const signed = await createR2UploadPresignedUrl({ objectKey: key, contentType: "image/png" });
        assert.equal(decodeURIComponent(new URL(signed.uploadUrl).pathname), "/compat-test/old-bucket/" + key);
      }
    });

    await check("R2 compatibility: physical registered keys and canonical media never get a second prefix", async () => {
      for (const key of ["old-bucket/coaching/s/images/existing.png", "media/shared/a/original.png", "media/personal/u/a/original.mp3"]) {
        commands.length = 0;
        await headR2StoredObject(key);
        await getR2StoredObject(key, "bytes=0-2");
        assert.equal(commands.length, 2);
        assert(commands.every(c => c.key === key));
      }
      const store = createR2UploadStore();
      const staging = "media/staging/upload/source.png";
      const signed = await store.presignStagingPut({ objectKey: staging, contentType: "image/png", byteSize: 10, expiresInSeconds: 60 });
      assert.equal(new URL(signed).pathname, "/compat-test/" + staging);
      const sourcePath = path.join(dir, "fixture.png");
      await writeFile(sourcePath, "fixture");
      commands.length = 0;
      const final = "media/shared/asset/original.png";
      assert.equal(await store.putIfAbsent({ objectKey: final, contentType: "image/png", sourcePath }), "created");
      assert.deepEqual(commands.map(c => [c.type, c.key, c.conditional]), [["PutObjectCommand", final, "*"]]);
    });

    await check("R2 compatibility: legacy writers cannot accept physical keys, canonical media or traversal", async () => {
      commands.length = 0;
      for (const key of ["old-bucket/coaching/s/image.png", "media/shared/a/original.png", "media/staging/u/source.png", "coaching/s/../image.png", "avatars//image.png", "/avatars/u/image.png"]) {
        await assert.rejects(putR2Object({ objectKey: key, contentType: "image/png", body: Buffer.from("fixture") }), code("MEDIA_KEY_REJECTED"));
      }
      assert.equal(commands.length, 0);
      assert.equal(legacyR2ObjectKey("coaching/s/images/file%20name.png", "old-bucket/"), "old-bucket/coaching/s/images/file%20name.png", "no second decoding");
    });

    await check("R2 compatibility: real delivery adapters preserve exact physical key for full and Range responses", async () => {
      for (const key of ["old-bucket/coaching/s/images/existing.png", "media/shared/a/original.png"]) {
        const handler = createMediaGetHandler({ resolve: async () => ({ objectKey: key, isPublic: false, mimeType: "image/png" }) });
        for (const [range, status, bytes] of [[undefined, 200, "0123456789"], ["bytes=2-4", 206, "234"], ["bytes=99-100", 416, ""]] as const) {
          commands.length = 0;
          const response = await handler(new Request("https://app.example.invalid/api/media/r2", { headers: range ? { range } : {} }));
          assert.equal(response.status, status);
          assert.equal(await response.text(), bytes);
          assert.equal(response.headers.get("cache-control"), "private, no-store");
          assert(commands.length > 0 && commands.every(c => c.key === key));
        }
      }
      commands.length = 0;
      const denied = createMediaGetHandler({ resolve: async () => { throw new ApiError("Forbidden", 403, "FORBIDDEN"); } });
      assert.equal((await denied(new Request("https://app.example.invalid/api/media/r2", { headers: { range: "bytes=0-1" } }))).status, 403);
      assert.equal(commands.length, 0);
    });

    await check("R2 compatibility: missing physical object never retries a guessed alternate location", async () => {
      const capture = S3Client.prototype.send;
      let calls = 0;
      S3Client.prototype.send = (async () => { calls++; throw { $metadata: { httpStatusCode: 404 } }; }) as typeof send;
      try {
        await assert.rejects(getR2StoredObject("old-bucket/coaching/s/missing.png"));
        assert.equal(calls, 1);
      } finally { S3Client.prototype.send = capture; }
    });

    await check("R2 compatibility: prefixed legacy URLs use the proxy; fresh buckets keep their original namespace", async () => {
      const key = "avatars/u/image.png";
      assert.equal(buildR2MediaUrl(key), "/api/media/r2?key=" + encodeURIComponent(key));
      process.env.R2_LEGACY_KEY_PREFIX = "";
      try {
        assert.equal(buildR2MediaUrl(key), env.R2_PUBLIC_BASE_URL + "/" + key);
        commands.length = 0;
        await putR2Object({ objectKey: key, contentType: "image/png", body: Buffer.from("fixture") });
        assert.equal(commands[0].key, key);
      } finally { process.env.R2_LEGACY_KEY_PREFIX = env.R2_LEGACY_KEY_PREFIX; }
    });

    await check("R2 compatibility: canonical production upload remains blocked after endpoint normalization", async () => {
      process.env.R2_BUCKET = "online-glia";
      try { assert.throws(createR2UploadStore, code("R2_BUCKET_NOT_ISOLATED")); }
      finally { process.env.R2_BUCKET = env.R2_BUCKET; }
    });
  } finally {
    S3Client.prototype.send = send;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
}
