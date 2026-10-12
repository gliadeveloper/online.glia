import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { verifyMediaContent } from "../src/lib/media/verify-content";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const execute = promisify(execFile);

export async function runMediaContentIntegration(check: Check) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "glia-decoder-fixtures-"));
  const ffmpeg = process.env.MEDIA_FFMPEG_PATH || "ffmpeg";
  const generate = (args: string[]) => execute(ffmpeg, ["-v", "error", "-nostdin", ...args], { timeout: 15000, maxBuffer: 1024 * 1024 });
  try {
    await check("media decoder: WAV audio decodes completely", async () => {
      const file = path.join(dir, "audio.wav");
      await generate(["-f", "lavfi", "-i", "sine=frequency=440:duration=0.1", "-c:a", "pcm_s16le", file]);
      await verifyMediaContent(file, "audio/wav");
    });
    await check("media decoder: MP4 video decodes completely", async () => {
      const file = path.join(dir, "video.mp4");
      await generate(["-f", "lavfi", "-i", "color=c=blue:s=16x16:d=0.1", "-c:v", "mpeg4", file]);
      await verifyMediaContent(file, "video/mp4");
      await assert.rejects(verifyMediaContent(file, "audio/mp4"), (e: unknown) => (e as { code?: string }).code === "CONTENT_MISMATCH");
    });
    await check("media decoder: M4A audio cannot masquerade as MP4 video", async () => {
      const file = path.join(dir, "audio.m4a");
      await generate(["-f", "lavfi", "-i", "sine=frequency=440:duration=0.1", "-c:a", "aac", file]);
      await verifyMediaContent(file, "audio/mp4");
      await assert.rejects(verifyMediaContent(file, "video/mp4"), (e: unknown) => (e as { code?: string }).code === "CONTENT_MISMATCH");
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
}
