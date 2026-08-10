import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";

type LessonContentRow = {
  id: string;
  type: string;
  body: string | null;
  title?: string | null;
  metadata?: unknown;
};

/** 레슨 본문 마크다운 콘텐츠 (DB type HTML) */
export function getLessonMarkdownContent(contents: LessonContentRow[]) {
  return (
    contents.find((content) => content.type === "HTML" && content.body) ??
    contents.find(
      (content) =>
        content.type === "HTML" && Boolean(getBlockNoteBlocksFromMetadata(content.metadata)),
    ) ??
    contents.find((content) => content.body) ??
    null
  );
}

export function isLessonMarkdownContent(content: {
  type: string;
  body: string | null;
  metadata?: unknown;
}) {
  if (content.type !== "HTML") return false;
  if (content.body) return true;
  return Boolean(getBlockNoteBlocksFromMetadata(content.metadata));
}

export function lessonSupportsMarkdownEditor(lessonType: string) {
  return lessonType === "TEXT";
}
