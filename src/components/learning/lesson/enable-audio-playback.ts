"use client";

import { defaultBlockSpecs } from "@blocknote/core";

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

/** BlockNote renders an <audio controls> player. Keep those controls from selecting the block. */
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
  }
}
