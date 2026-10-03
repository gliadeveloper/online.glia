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
const MP4_AUDIO_URL = /\.(m4a|mp4|mp4a|caf)(?:$|[?#&])/i;

function isMp4AudioUrl(src: string) {
  try {
    return MP4_AUDIO_URL.test(decodeURIComponent(src));
  } catch {
    return MP4_AUDIO_URL.test(src);
  }
}

function bindMediaControls(media: HTMLMediaElement) {
  media.controls = true;
  if (!media.getAttribute("preload")) media.preload = "metadata";
  media.setAttribute("contenteditable", "false");
  if (media instanceof HTMLVideoElement) media.playsInline = true;

  const block = media.closest("[data-content-type='audio']");
  if (block instanceof HTMLElement) block.contentEditable = "false";

  if (media.dataset.gliaAudioBound === "1") return;
  media.dataset.gliaAudioBound = "1";

  const stop = (event: Event) => {
    event.stopPropagation();
  };
  for (const type of MEDIA_EVENTS) {
    media.addEventListener(type, stop);
  }
}

/** Chrome's audio element does not decode m4a. A video element does. */
function swapMp4AudioToVideo(audio: HTMLAudioElement) {
  const src = audio.getAttribute("src")?.trim() ?? "";
  if (!src || src.startsWith("blob:") || !isMp4AudioUrl(src)) return false;

  const video = document.createElement("video");
  video.className = "bn-audio";
  video.src = src;
  bindMediaControls(video);
  audio.replaceWith(video);
  return true;
}

/** Keep native audio controls usable inside the BlockNote editor. */
export function enableAudioPlayback(root: ParentNode) {
  for (const node of root.querySelectorAll("audio")) {
    if (!(node instanceof HTMLAudioElement)) continue;
    if (swapMp4AudioToVideo(node)) continue;
    bindMediaControls(node);
  }

  for (const node of root.querySelectorAll("video.bn-audio")) {
    if (node instanceof HTMLVideoElement) bindMediaControls(node);
  }
}
