import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ApiError } from "@/lib/api";
import { libraryMediaRule, type LibraryMimeType } from "./content-signature";

const execute = promisify(execFile);
const FORMATS: Record<LibraryMimeType, string> = {
  "image/jpeg": "jpeg_pipe", "image/png": "png_pipe", "image/webp": "webp_pipe",
  "image/gif": "gif", "image/avif": "mov", "video/mp4": "mov",
  "video/quicktime": "mov", "video/webm": "matroska", "audio/mpeg": "mp3",
  "audio/mp4": "mov", "audio/wav": "wav", "audio/aac": "aac", "audio/ogg": "ogg",
  "audio/flac": "flac", "audio/aiff": "aiff", "audio/x-caf": "caf",
};
const IMAGE_CODECS: Record<string, string> = {
  "image/jpeg": "mjpeg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "av1",
};

async function run(binary: string, args: string[]) {
  try {
    return await execute(binary, args, { timeout: 90_000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, windowsHide: true });
  } catch (error) {
    const failure = error as { code?: string | number; killed?: boolean };
    if (failure.code === "ENOENT" || failure.code === "EACCES") {
      throw new ApiError("미디어 검증기를 사용할 수 없습니다.", 503, "MEDIA_VALIDATOR_UNAVAILABLE");
    }
    if (failure.killed || failure.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      throw new ApiError("미디어 검증 제한을 초과했습니다.", 422, "MEDIA_VALIDATION_LIMIT");
    }
    throw new ApiError("파일 내용을 정상적으로 재생할 수 없습니다.", 422, "CONTENT_MISMATCH");
  }
}

/** Decode the complete local object; magic bytes and HEAD alone never authorize READY.
 * Force a known demuxer (no playlists), disallow network protocols, cap runtime/output,
 * threads and individual allocations. Production still needs an isolated worker with
 * OS memory/CPU limits; these subprocess flags are not a sandbox or a malware scan.
 */
export async function verifyMediaContent(filePath: string, mimeType: LibraryMimeType) {
  const input = ["-max_alloc", "268435456", "-threads", "1", "-protocol_whitelist", "file", "-f", FORMATS[mimeType], "-i", filePath];
  const { stdout } = await run(process.env.MEDIA_FFPROBE_PATH || "ffprobe", [
    "-v", "error", ...input, "-show_entries", "stream=codec_type,codec_name,width,height:stream_disposition=attached_pic", "-of", "json",
  ]);
  let streams: { codec_type?: string; codec_name?: string; width?: number; height?: number; disposition?: { attached_pic?: number } }[];
  try { streams = JSON.parse(stdout).streams; }
  catch { throw new ApiError("미디어 정보를 확인하지 못했습니다.", 422, "CONTENT_MISMATCH"); }
  if (!Array.isArray(streams) || streams.length > 16) throw new ApiError("미디어 구성이 올바르지 않습니다.", 422, "CONTENT_MISMATCH");
  const visual = streams.filter(s => s.codec_type === "video" && !s.disposition?.attached_pic);
  const sound = streams.filter(s => s.codec_type === "audio");
  const kind = libraryMediaRule(mimeType)!.kind;
  if ((kind === "AUDIO" && (!sound.length || visual.length)) ||
      (kind !== "AUDIO" && !visual.length) ||
      (kind === "IMAGE" && (sound.length || visual.some(s => s.codec_name !== IMAGE_CODECS[mimeType]))) ||
      visual.some(s => !s.width || !s.height || s.width * s.height > 40_000_000)) {
    throw new ApiError("파일 내용이 선언한 형식과 일치하지 않습니다.", 422, "CONTENT_MISMATCH");
  }
  await run(process.env.MEDIA_FFMPEG_PATH || "ffmpeg", [
    "-v", "error", "-nostdin", "-xerror", "-err_detect", "explode", ...input,
    "-map", "0:v?", "-map", "0:a?", "-threads", "1", "-f", "null", "-",
  ]);
}
