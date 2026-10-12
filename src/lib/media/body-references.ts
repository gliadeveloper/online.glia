import "server-only";

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { ApiError } from "@/lib/api";
import type { MediaBody } from "./body-version";

export type MediaReference = { assetId?: string; key?: string };
export type ReferenceConfig = { appOrigin: string; publicBaseUrl?: string | null };

export function mediaReferenceConfig(): ReferenceConfig {
  return { appOrigin: process.env.APP_URL?.trim() || "https://online.glia.kr", publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim() };
}

export function mediaUrlKey(value: string, config: ReferenceConfig): string | null {
  let url: URL;
  try { url = new URL(value, config.appOrigin); } catch { return null; }
  if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) return null;
  let key: string | null = null;
  if (url.origin === new URL(config.appOrigin).origin && url.pathname === "/api/media/r2") {
    if (url.searchParams.getAll("key").length !== 1) throw new ApiError("미디어 주소가 올바르지 않습니다.", 400, "INVALID_MEDIA_REFERENCE");
    key = url.searchParams.get("key");
  } else if (config.publicBaseUrl) {
    const base = new URL(config.publicBaseUrl);
    const prefix = base.pathname.replace(/\/$/, "") + "/";
    if (url.origin === base.origin && url.pathname.startsWith(prefix)) {
      try { key = decodeURIComponent(url.pathname.slice(prefix.length)); } catch { key = null; }
    }
  }
  if (key !== null && (!key || key.length > 1024 || /[\u0000-\u001f\\]/.test(key) || key.split("/").some(p => p === "." || p === ".."))) {
    throw new ApiError("미디어 주소가 올바르지 않습니다.", 400, "INVALID_MEDIA_REFERENCE");
  }
  return key;
}

/** Keep representations separate: JSON and its Markdown mirror are not two uses. */
export function extractMediaReferences(
  body: MediaBody,
  config = mediaReferenceConfig(),
  resolveUrl: (value: string) => string | null = value => mediaUrlKey(value, config),
): MediaReference[][] {
  if (JSON.stringify(body).length > 2_000_000) throw new ApiError("본문이 너무 큽니다.", 413, "BODY_TOO_LARGE");
  const blocks: MediaReference[] = [];
  const markdown: MediaReference[] = [];
  const topLevel: MediaReference[] = [];
  const addUrl = (list: MediaReference[], value: unknown, assetId?: unknown) => {
    if (assetId !== undefined && (typeof assetId !== "string" || !assetId || assetId.length > 191)) {
      throw new ApiError("자산 ID가 올바르지 않습니다.", 400, "INVALID_MEDIA_REFERENCE");
    }
    const key = typeof value === "string" && value ? resolveUrl(value) : null;
    if (assetId || key) list.push({ ...(assetId ? { assetId: assetId as string } : {}), ...(key ? { key } : {}) });
  };
  let nodes = 0;
  function visitBlock(value: unknown, depth = 0) {
    if (++nodes > 20000 || depth > 64) throw new ApiError("본문 구조가 너무 복잡합니다.", 400, "INVALID_MEDIA_REFERENCE");
    if (Array.isArray(value)) { for (const item of value) visitBlock(item, depth + 1); return; }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (["image", "video", "audio", "file"].includes(String(node.type))) {
      const props = node.props as Record<string, unknown> | undefined;
      if (props && typeof props === "object") addUrl(blocks, props.url, props.assetId);
    }
    if (node.type === "link") addUrl(blocks, node.href);
    for (const name of ["children", "content", "rows", "cells"]) if (node[name]) visitBlock(node[name], depth + 1);
  }
  const metadata = body.metadata as { blocknote?: { blocks?: unknown } } | null;
  if (metadata?.blocknote !== undefined) {
    if (!metadata.blocknote || !Array.isArray(metadata.blocknote.blocks)) throw new ApiError("블록 본문이 올바르지 않습니다.", 400, "INVALID_MEDIA_REFERENCE");
    visitBlock(metadata.blocknote.blocks);
  }
  function visitHtml(node: DefaultTreeAdapterMap["node"], depth = 0) {
    if (++nodes > 20000 || depth > 64) throw new ApiError("본문 구조가 너무 복잡합니다.", 400, "INVALID_MEDIA_REFERENCE");
    if ("tagName" in node) {
      for (const attr of node.attrs) {
        if ((["img", "video", "audio", "source"].includes(node.tagName) && attr.name === "src") ||
            (node.tagName === "video" && attr.name === "poster") || (node.tagName === "a" && attr.name === "href")) addUrl(markdown, attr.value);
      }
    }
    if ("childNodes" in node) for (const child of node.childNodes) visitHtml(child, depth + 1);
  }
  if (body.body) {
    const tree = fromMarkdown(body.body, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
    const definitions = new Map<string, string>();
    function collect(node: typeof tree | (typeof tree.children)[number], depth = 0) {
      if (++nodes > 20000 || depth > 64) throw new ApiError("본문 구조가 너무 복잡합니다.", 400, "INVALID_MEDIA_REFERENCE");
      // CommonMark resolves duplicate definitions to the first occurrence.
      if (node.type === "definition" && !definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
      if ("children" in node) for (const child of node.children) collect(child as typeof node, depth + 1);
    }
    collect(tree);
    function visit(node: typeof tree | (typeof tree.children)[number]) {
      if (node.type === "image" || node.type === "link") addUrl(markdown, node.url);
      if (node.type === "imageReference" || node.type === "linkReference") addUrl(markdown, definitions.get(node.identifier));
      if (node.type === "html") visitHtml(parseFragment(node.value));
      if ("children" in node) for (const child of node.children) visit(child as typeof node);
    }
    visit(tree);
  }
  addUrl(topLevel, body.url);
  return [blocks, markdown, topLevel];
}
