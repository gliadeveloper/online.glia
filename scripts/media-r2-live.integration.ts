import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chromium, type Browser } from "@playwright/test";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { parse } from "dotenv";
import type { PrismaClient } from "../src/generated/prisma/client";
import { reserveOriginalUpload, completeOriginalUpload } from "../src/lib/media/prepare-upload";
import { createR2UploadStore } from "../src/lib/media/r2-upload-store";
import { createR2Client, requireR2Config } from "../src/lib/media/r2";
import { createMediaGetHandler } from "../src/lib/media/media-delivery";
import { resolveMediaLocation } from "../src/lib/media/media-location";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const execute = promisify(execFile);
const origin = "http://localhost:3000";

/** Explicit live opt-in from the isolated DB harness; never starts the real local app. */
export async function runMediaR2LiveIntegration(db: PrismaClient, check: Check) {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  assert.equal(process.env.MEDIA_UPLOAD_LIVE, "1");
  assert.equal(dbUrl.hostname, "localhost");
  assert.match(dbUrl.searchParams.get("host") ?? "", /^\/(?:private\/)?tmp\/media-db-[^/]+$/);
  const env = parse(await readFile(process.env.MEDIA_R2_LIVE_ENV_FILE || ".env.local"));
  assert.equal(env.R2_BUCKET, "online-glia-dev");
  assert(!env.R2_LEGACY_KEY_PREFIX, "live fixtures require canonical keys");
  const names = ["R2_BUCKET", "R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_REGION", "R2_PUBLIC_BASE_URL", "R2_LEGACY_KEY_PREFIX"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const dir = await mkdtemp(path.join(os.tmpdir(), "glia-r2-live-"));
  const keys: string[] = [], results: { mime: string; scope: string; bytes: number; passed: boolean }[] = [];
  let browser: Browser | undefined;
  let allPassed = true;
  try {
    for (const name of names) process.env[name] = env[name] || "";
    const config = requireR2Config();
    const store = createR2UploadStore();
    const client = createR2Client(config);
    const persist = () => writeFile(path.join(dir, "manifest.private.json"), JSON.stringify({ bucket: config.bucket, keys, results, productionWritten: false }, null, 2), { mode: 0o600 });
    try {
      const generate = (args: string[]) => execute(process.env.MEDIA_FFMPEG_PATH || "ffmpeg", ["-v", "error", "-nostdin", ...args], { timeout: 30000, maxBuffer: 1024 * 1024 });
      await writeFile(path.join(dir, "image.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
      await generate(["-f", "lavfi", "-i", "testsrc2=size=160x90:rate=24:duration=3", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", "-shortest", path.join(dir, "video.mp4")]);
      for (const [file, codec] of [["audio.mp3", "libmp3lame"], ["audio.m4a", "aac"]]) {
        await generate(["-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:a", codec, path.join(dir, file)]);
      }
      browser = await chromium.launch({ channel: "chrome", headless: true });
      const context = await browser.newContext();
      const uploads = new Set<string>();
      const handler = createMediaGetHandler({ resolve: url => resolveMediaLocation(db, url, async () => "upload-coach", config.bucket) });
      const denied = createMediaGetHandler({ resolve: url => resolveMediaLocation(db, url, async () => "student", config.bucket) });
      const ranges: string[] = [];
      // Only the local fixture document/transport is replaced. Cross-origin PUTs
      // go to real R2 with browser security enabled; no CORS response is mocked.
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (uploads.has(url.href) && ["PUT", "OPTIONS"].includes(request.method())) { await route.continue(); return; }
        if (url.origin !== origin) { await route.abort(); return; }
        if (url.pathname === "/") {
          await route.fulfill({ contentType: "text/html", body: "<!doctype html><meta charset=utf-8><title>GLIA isolated media verification</title><main id=media></main>" }); return;
        }
        if (["/api/media/r2", "/denied"].includes(url.pathname)) {
          const headers = request.headers(); if (headers.range) ranges.push(headers.range);
          const response = await (url.pathname === "/denied" ? denied : handler)(new Request(url, { headers }));
          await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) }); return;
        }
        await route.abort();
      });
      const page = await context.newPage();
      await page.goto(origin);
      for (const fixture of [
        { file: "image.png", mime: "image/png", scope: "PERSONAL", actor: "upload-coach", tag: "img" },
        { file: "video.mp4", mime: "video/mp4", scope: "SHARED", actor: "upload-admin", tag: "video" },
        { file: "audio.mp3", mime: "audio/mpeg", scope: "PERSONAL", actor: "upload-coach", tag: "audio" },
        { file: "audio.m4a", mime: "audio/mp4", scope: "SHARED", actor: "upload-admin", tag: "audio" },
      ] as const) {
        await check(`R2 browser live: ${fixture.mime} ${fixture.scope} PUT, verify, replay, Range and access`, async () => {
          let stage = "RESERVE";
          const bytes = await readFile(path.join(dir, fixture.file));
          const result = { mime: fixture.mime, scope: fixture.scope, bytes: bytes.length, passed: false }; results.push(result);
          try {
            const reserved = await reserveOriginalUpload(db, { actorId: fixture.actor, scope: fixture.scope, fileName: fixture.file, contentType: fixture.mime, byteSize: bytes.length }, store);
            const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId }, include: { file: true } });
            keys.push(upload.stagingObjectKey, upload.file.objectKey); await persist();
            uploads.add(reserved.uploadUrl!);
            stage = "BROWSER_CORS_PUT";
            const status = await page.evaluate(async ({ url, mime, base64 }) => {
              const body = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
              return (await fetch(url, { method: "PUT", headers: { "content-type": mime }, body, signal: AbortSignal.timeout(45000) })).status;
            }, { url: reserved.uploadUrl!, mime: fixture.mime, base64: bytes.toString("base64") });
            assert.equal(status, 200);
            stage = "VERIFY_AND_COMPLETE";
            const completed = await completeOriginalUpload(db, { actorId: fixture.actor, uploadId: reserved.uploadId }, store);
            assert.equal(completed.status, "COMPLETED");
            const file = await db.mediaFile.findUniqueOrThrow({ where: { id: upload.fileId } });
            assert.equal(file.sha256, createHash("sha256").update(bytes).digest("hex"));
            assert.equal(file.byteSize, BigInt(bytes.length)); assert(file.verifiedAt);
            stage = "BROWSER_RANGE";
            const response = await page.evaluate(async url => {
              const ranged = await fetch(url, { headers: { range: "bytes=0-31" } });
              const payload = Array.from(new Uint8Array(await ranged.arrayBuffer()));
              const absentRange = await fetch(url, { headers: { range: "bytes=999999999-" } });
              const forbidden = await fetch(url.replace("/api/media/r2", "/denied"));
              return { status: ranged.status, contentRange: ranged.headers.get("content-range"), cache: ranged.headers.get("cache-control"), payload, invalid: absentRange.status, forbidden: forbidden.status };
            }, completed.mediaUrl!);
            assert.equal(response.status, 206); assert.equal(response.contentRange, `bytes 0-31/${bytes.length}`);
            assert.deepEqual(Buffer.from(response.payload), bytes.subarray(0, 32));
            assert.equal(response.cache, "private, no-store"); assert.equal(response.invalid, 416); assert.equal(response.forbidden, 404);
            stage = "BROWSER_DECODE_AND_SEEK";
            await page.evaluate(({ tag, url }) => {
              document.querySelector("#media")!.innerHTML = "";
              const el = document.createElement(tag); el.id = "fixture"; el.setAttribute("src", url);
              if (el instanceof HTMLMediaElement) { el.preload = "auto"; el.muted = true; el.controls = true; }
              document.querySelector("#media")!.append(el);
            }, { tag: fixture.tag, url: completed.mediaUrl! });
            await page.waitForFunction(() => { const el = document.querySelector("#fixture"); return el instanceof HTMLImageElement ? el.complete && el.naturalWidth > 0 : el instanceof HTMLMediaElement && el.readyState >= 2 && el.duration > 0; }, undefined, { timeout: 20000 });
            if (fixture.tag !== "img") {
              await page.evaluate(async () => { await (document.querySelector("#fixture") as HTMLMediaElement).play(); });
              await page.waitForFunction(() => (document.querySelector("#fixture") as HTMLMediaElement).currentTime > 0.1);
              await page.evaluate(() => { const el = document.querySelector("#fixture") as HTMLMediaElement; el.pause(); el.currentTime = 1.5; });
              await page.waitForFunction(() => { const el = document.querySelector("#fixture") as HTMLMediaElement; return !el.seeking && Math.abs(el.currentTime - 1.5) < 0.2; });
            }
            await page.evaluate(() => { document.querySelector("#media")!.innerHTML = ""; });
            stage = "IDEMPOTENT_COMPLETE";
            assert.equal((await completeOriginalUpload(db, { actorId: fixture.actor, uploadId: reserved.uploadId }, store)).assetId, reserved.assetId);
            result.passed = true; await persist();
          } catch {
            allPassed = false; await persist();
            // Playwright errors can contain signed URLs. Keep failure output bounded.
            throw new Error(`LIVE_MEDIA_FAILED:${fixture.mime}:${stage}`);
          }
        });
      }
      assert(ranges.length > 0);
    } finally {
      await browser?.close(); browser = undefined;
      try {
        await check("R2 browser live: remove only this run's objects and verify absence", async () => {
          const failures: string[] = [];
          for (const key of keys) {
            try {
              assert(key.startsWith("media/staging/") || key.startsWith("media/shared/") || key.startsWith("media/personal/upload-coach/"));
              await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) });
              await assert.rejects(client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) }), (e: unknown) => (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404);
            } catch { failures.push("CLEANUP_FAILED"); }
          }
          if (failures.length) { allPassed = false; await persist(); }
          assert.equal(failures.length, 0, "Test object cleanup requires review");
        });
      } finally { client.destroy(); }
    }
    if (allPassed) await rm(dir, { recursive: true, force: true });
    else console.error(`Live test object manifest retained: ${dir}`);
  } finally {
    await browser?.close();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}
