"use client";

import { defaultBlockSpecs } from "@blocknote/core";

import { audioMimeFromName } from "@/lib/media/playback-content-type";

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".aac",
  ".ogg",
  ".oga",
  ".flac",
  ".aiff",
  ".aif",
  ".caf",
  ".wave",
];

const audioAccept = defaultBlockSpecs.audio.implementation.meta?.fileBlockAccept;
if (Array.isArray(audioAccept)) {
  for (const extension of AUDIO_EXTENSIONS) {
    if (!audioAccept.includes(extension)) audioAccept.push(extension);
  }
}

const MEDIA_EVENTS = ["pointerdown", "mousedown", "mouseup", "click", "touchstart"] as const;

async function recoverAudio(audio: HTMLAudioElement, src: string) {
  const response = await fetch(src, { credentials: "include" });
  if (!response.ok) return;

  const headerType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const type = headerType?.startsWith("audio/") ? headerType : (audioMimeFromName(src) ?? "audio/mpeg");
  const blob = new Blob([await response.arrayBuffer()], { type });
  const objectUrl = URL.createObjectURL(blob);
  const previous = audio.src;
  if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
  audio.src = objectUrl;
  audio.load();
}

/** Keep native audio controls usable inside the BlockNote editor. */
export function enableAudioPlayback(root: ParentNode) {
  for (const node of root.querySelectorAll("audio")) {
    if (!(node instanceof HTMLAudioElement)) continue;
    const audio = node;
    audio.controls = true;
    if (!audio.getAttribute("preload")) audio.preload = "metadata";
    audio.setAttribute("contenteditable", "false");

    const block = audio.closest("[data-content-type='audio']");
    if (block instanceof HTMLElement) block.contentEditable = "false";

    if (audio.dataset.gliaAudioBound === "1") continue;
    audio.dataset.gliaAudioBound = "1";

    const stop = (event: Event) => {
      event.stopPropagation();
    };
    for (const type of MEDIA_EVENTS) {
      audio.addEventListener(type, stop);
    }

    audio.addEventListener("error", () => {
      if (audio.dataset.gliaAudioRecover === "1") return;
      const src = audio.getAttribute("src")?.trim() ?? "";
      if (!src || src.startsWith("blob:")) return;
      const code = audio.error?.code;
      if (
        code !== MediaError.MEDIA_ERR_NETWORK &&
        code !== MediaError.MEDIA_ERR_DECODE &&
        code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      ) {
        return;
      }
      audio.dataset.gliaAudioRecover = "1";
      void recoverAudio(audio, src);
    });
  }
}
