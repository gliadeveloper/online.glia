import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";

export function coachingSessionHasBody(session: {
  bodyMarkdown: string | null;
  bodyMetadata?: unknown;
}) {
  if (session.bodyMarkdown?.trim()) return true;
  return Boolean(getBlockNoteBlocksFromMetadata(session.bodyMetadata));
}
