import type { Block } from "@blocknote/core";
import type { Prisma } from "@/generated/prisma/client";

import { parseContentMetadata } from "@/lib/media/content-metadata";

const BLOCKNOTE_VERSION = 1 as const;

export type BlockNoteStoredMetadata = {
  version: 1 | 2;
  blocks: Block[];
};

/** Legacy custom block types — stripped when loading with default schema. */
const REMOVED_BLOCK_TYPES = new Set(["linkPreview"]);

export function getBlockNoteBlocksFromMetadata(metadata: unknown): Block[] | null {
  const parsed = parseContentMetadata(metadata as Prisma.JsonValue | null | undefined);
  if (!parsed || typeof parsed !== "object") return null;

  const blocknote = (parsed as { blocknote?: BlockNoteStoredMetadata }).blocknote;
  if (!blocknote?.blocks || !Array.isArray(blocknote.blocks) || blocknote.blocks.length === 0) {
    return null;
  }

  const blocks = (blocknote.blocks as Block[]).filter(
    (block) => !REMOVED_BLOCK_TYPES.has(String(block.type)),
  );

  if (blocks.length === 0) return null;

  return blocks;
}

export function buildContentMetadataWithBlockNote(
  existingMetadata: unknown,
  blocks: Block[],
  version: 1 | 2 = BLOCKNOTE_VERSION,
): Prisma.InputJsonValue {
  const base = parseContentMetadata(existingMetadata as Prisma.JsonValue | null | undefined) ?? {};

  return {
    ...base,
    blocknote: {
      version,
      blocks: blocks as unknown as Prisma.InputJsonValue,
    },
  } as Prisma.InputJsonValue;
}
