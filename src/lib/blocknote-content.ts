import type { Block } from "@blocknote/core";
import type { Prisma } from "@/generated/prisma/client";

import { parseContentMetadata } from "@/lib/media/content-metadata";

const BLOCKNOTE_VERSION = 1 as const;

export type BlockNoteStoredMetadata = {
  version: typeof BLOCKNOTE_VERSION;
  blocks: Block[];
};

/** Legacy custom block types — stripped when loading with default schema. */
const REMOVED_BLOCK_TYPES = new Set(["linkPreview"]);

const AUDIO_FILE_PATTERN = /\.(mp3|m4a|aac|wav|wave|ogg|oga|flac|aiff|aif|caf)(?:$|[?#&])/i;

function asPlayableAudioBlock(block: Block): Block {
  if (block.type !== "file") return block;
  const props = block.props as { name?: unknown; url?: unknown } | undefined;
  const name = typeof props?.name === "string" ? props.name : "";
  const url = typeof props?.url === "string" ? props.url : "";
  if (!AUDIO_FILE_PATTERN.test(`${name} ${url}`)) return block;
  const fileProps = block.props as {
    backgroundColor?: string;
    name?: string;
    url?: string;
    caption?: string;
  };
  return {
    ...block,
    type: "audio",
    props: {
      backgroundColor: fileProps.backgroundColor ?? "default",
      name: fileProps.name ?? "",
      url: fileProps.url ?? "",
      caption: fileProps.caption ?? "",
      showPreview: true,
    },
  } as Block;
}

export function getBlockNoteBlocksFromMetadata(metadata: unknown): Block[] | null {
  const parsed = parseContentMetadata(metadata as Prisma.JsonValue | null | undefined);
  if (!parsed || typeof parsed !== "object") return null;

  const blocknote = (parsed as { blocknote?: BlockNoteStoredMetadata }).blocknote;
  if (!blocknote?.blocks || !Array.isArray(blocknote.blocks) || blocknote.blocks.length === 0) {
    return null;
  }

  const blocks = (blocknote.blocks as Block[])
    .filter((block) => !REMOVED_BLOCK_TYPES.has(String(block.type)))
    .map(asPlayableAudioBlock);

  if (blocks.length === 0) return null;

  return blocks;
}

export function buildContentMetadataWithBlockNote(
  existingMetadata: unknown,
  blocks: Block[],
): Prisma.InputJsonValue {
  const base = parseContentMetadata(existingMetadata as Prisma.JsonValue | null | undefined) ?? {};

  return {
    ...base,
    blocknote: {
      version: BLOCKNOTE_VERSION,
      blocks: blocks as unknown as Prisma.InputJsonValue,
    },
  } as Prisma.InputJsonValue;
}
