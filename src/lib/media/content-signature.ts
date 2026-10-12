const MIME_RULES = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg", maxBytes: 10 * 1024 * 1024 },
  "image/png": { kind: "IMAGE", ext: "png", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { kind: "IMAGE", ext: "webp", maxBytes: 10 * 1024 * 1024 },
  "image/gif": { kind: "IMAGE", ext: "gif", maxBytes: 10 * 1024 * 1024 },
  "image/avif": { kind: "IMAGE", ext: "avif", maxBytes: 10 * 1024 * 1024 },
  "video/mp4": { kind: "VIDEO", ext: "mp4", maxBytes: 500 * 1024 * 1024 },
  "video/webm": { kind: "VIDEO", ext: "webm", maxBytes: 500 * 1024 * 1024 },
  "video/quicktime": { kind: "VIDEO", ext: "mov", maxBytes: 500 * 1024 * 1024 },
  "audio/mpeg": { kind: "AUDIO", ext: "mp3", maxBytes: 200 * 1024 * 1024 },
  "audio/mp4": { kind: "AUDIO", ext: "m4a", maxBytes: 200 * 1024 * 1024 },
  "audio/wav": { kind: "AUDIO", ext: "wav", maxBytes: 200 * 1024 * 1024 },
  "audio/aac": { kind: "AUDIO", ext: "aac", maxBytes: 200 * 1024 * 1024 },
  "audio/ogg": { kind: "AUDIO", ext: "ogg", maxBytes: 200 * 1024 * 1024 },
  "audio/flac": { kind: "AUDIO", ext: "flac", maxBytes: 200 * 1024 * 1024 },
  "audio/aiff": { kind: "AUDIO", ext: "aiff", maxBytes: 200 * 1024 * 1024 },
  "audio/x-caf": { kind: "AUDIO", ext: "caf", maxBytes: 200 * 1024 * 1024 },
} as const;

export type LibraryMediaKind = "IMAGE" | "VIDEO" | "AUDIO";
export type LibraryMimeType = keyof typeof MIME_RULES;

const AUDIO_ALIASES: Record<string, LibraryMimeType> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-aac": "audio/aac",
};

export function libraryMediaRule(contentType: string) {
  if (typeof contentType !== "string") return null;
  const normalized = contentType.trim().toLowerCase();
  const mimeType = (Object.hasOwn(AUDIO_ALIASES, normalized) ? AUDIO_ALIASES[normalized] : normalized) as LibraryMimeType;
  const rule = Object.hasOwn(MIME_RULES, mimeType) ? MIME_RULES[mimeType] : null;
  return rule ? { mimeType, ...rule } : null;
}

function ascii(bytes: Buffer, start: number, length: number) {
  return bytes.subarray(start, start + length).toString("latin1");
}

/** Container signature only. This does not decode the media. */
export function matchesDeclaredSignature(mimeType: LibraryMimeType, bytes: Buffer) {
  if (bytes.length < 12) return false;
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/gif") return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
  if (mimeType === "image/webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (mimeType === "image/avif") return ascii(bytes, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 4));
  if (mimeType === "video/mp4" || mimeType === "video/quicktime" || mimeType === "audio/mp4") return ascii(bytes, 4, 4) === "ftyp";
  if (mimeType === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mimeType === "audio/mpeg") return ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (mimeType === "audio/wav") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE";
  if (mimeType === "audio/aac") return bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
  if (mimeType === "audio/ogg") return ascii(bytes, 0, 4) === "OggS";
  if (mimeType === "audio/flac") return ascii(bytes, 0, 4) === "fLaC";
  if (mimeType === "audio/aiff") return ascii(bytes, 0, 4) === "FORM" && ascii(bytes, 8, 4) === "AIFF";
  if (mimeType === "audio/x-caf") return ascii(bytes, 0, 4) === "caff";
  return false;
}
