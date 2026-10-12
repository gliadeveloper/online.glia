import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { normalizeMarkdownDraft } from "@/lib/markdown-content";
import { extractMediaReferences } from "./body-references";

type BodyWrite = { body?: string | null; metadata?: Prisma.InputJsonValue | null };
const BLOCK_TYPES = new Set(["paragraph", "heading", "bulletListItem", "numberedListItem", "checkListItem", "toggleListItem", "codeBlock", "table", "file", "image", "video", "audio", "quote", "divider"]);
function documentPart(metadata: unknown) {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as { blocknote?: { version?: unknown; blocks?: unknown } }).blocknote : undefined;
}

/** Version 2 marks JSON as the source of truth. Version 1 documents retain the
 * conservative legacy behavior until explicitly saved by the new editor.
 */
export async function normalizeBlockNoteWrite(input: BodyWrite, previousMetadata?: unknown): Promise<BodyWrite> {
  if (input.body !== undefined && input.body !== null && typeof input.body !== "string") throw new ApiError("본문이 올바르지 않습니다.", 400, "INVALID_BLOCKNOTE_BODY");
  const document = documentPart(input.metadata);
  const wasCanonical = documentPart(previousMetadata)?.version === 2;
  if (wasCanonical && input.body !== undefined && input.metadata === undefined) {
    throw new ApiError("블록 본문을 함께 보내 주세요.", 409, "BLOCKNOTE_BLOCKS_REQUIRED");
  }
  if (wasCanonical && input.metadata !== undefined && input.metadata !== null && document?.version !== 2) throw new ApiError("기존 블록 본문 형식을 유지해 주세요.", 400, "INVALID_BLOCKNOTE_BODY");
  if (document?.version !== 2) return input;
  if (!Array.isArray(document.blocks)) throw new ApiError("블록 본문이 올바르지 않습니다.", 400, "INVALID_BLOCKNOTE_BODY");
  // Reuse the body size/depth/node limits before passing data to BlockNote.
  extractMediaReferences({ metadata: input.metadata });
  const ids = new Set<string>();
  function validate(blocks: unknown[], depth = 0) {
    if (depth > 64) throw new ApiError("블록 중첩이 너무 깊습니다.", 400, "INVALID_BLOCKNOTE_BODY");
    for (const value of blocks) {
      if (!value || typeof value !== "object") throw new ApiError("블록 본문이 올바르지 않습니다.", 400, "INVALID_BLOCKNOTE_BODY");
      const block = value as { type?: unknown; id?: unknown; children?: unknown };
      if (typeof block.type !== "string" || !BLOCK_TYPES.has(block.type)) throw new ApiError("지원하지 않는 블록입니다.", 400, "INVALID_BLOCKNOTE_BODY");
      if (block.id !== undefined) {
        if (typeof block.id !== "string" || !block.id || ids.has(block.id)) throw new ApiError("블록 ID가 올바르지 않습니다.", 400, "INVALID_BLOCKNOTE_BODY");
        ids.add(block.id);
      }
      if (block.children !== undefined) {
        if (!Array.isArray(block.children)) throw new ApiError("하위 블록이 올바르지 않습니다.", 400, "INVALID_BLOCKNOTE_BODY");
        validate(block.children, depth + 1);
      }
    }
  }
  validate(document.blocks);
  const { serializeDefaultBlocks } = await import("./blocknote-markdown.mjs");
  try {
    const body = normalizeMarkdownDraft(serializeDefaultBlocks(document.blocks).trim());
    extractMediaReferences({ body, metadata: input.metadata });
    return { ...input, body };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("블록 본문을 변환하지 못했습니다. 작성한 내용을 확인해 주세요.", 400, "INVALID_BLOCKNOTE_BODY");
  }
}
