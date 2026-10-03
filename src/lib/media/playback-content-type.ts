const AUDIO_EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  m4a: "video/mp4",
  mp4a: "video/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  wave: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  caf: "video/mp4",
};

const AUDIO_MIME_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/mp4": "video/mp4",
  "audio/m4a": "video/mp4",
  "audio/x-m4a": "video/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-aac": "audio/aac",
};

function fileExtension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#&])/);
  return match?.[1] ?? "";
}

export function audioMimeFromName(name: string) {
  return AUDIO_EXT_TO_MIME[fileExtension(name)] ?? null;
}

export function isAudioObjectKey(objectKey: string) {
  return /\/audio\//i.test(objectKey) || audioMimeFromName(objectKey) !== null;
}

/** Content-Type browsers will actually decode in an audio element. */
export function playbackContentType(objectKey: string, stored?: string | null) {
  const base = (stored ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (base.startsWith("audio/")) return AUDIO_MIME_ALIASES[base] ?? base;
  if (base && base !== "application/octet-stream" && base !== "binary/octet-stream") {
    return base;
  }
  return audioMimeFromName(objectKey) ?? (base || "application/octet-stream");
}
