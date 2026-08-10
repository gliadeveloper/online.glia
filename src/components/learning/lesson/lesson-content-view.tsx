"use client";

import dynamic from "next/dynamic";

import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";

import { LessonMarkdownView } from "./lesson-markdown-view";

const LessonBlockNoteView = dynamic(
  () =>
    import("@/components/learning/lesson/lesson-block-note-view").then(
      (mod) => mod.LessonBlockNoteView,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[6rem] animate-pulse rounded-lg bg-slate-100/80" aria-hidden="true" />
    ),
  },
);

type LessonContentViewProps = {
  body: string | null;
  metadata?: unknown;
  className?: string;
};

/**
 * Block JSON이 있으면 BlockNote read-only(에디터와 동일).
 * 없으면 legacy markdown fallback.
 */
export function LessonContentView({ body, metadata, className }: LessonContentViewProps) {
  const blocks = getBlockNoteBlocksFromMetadata(metadata);

  if (blocks?.length) {
    return <LessonBlockNoteView blocks={blocks} className={className} />;
  }

  if (body?.trim()) {
    return <LessonMarkdownView content={body} className={className} />;
  }

  return null;
}
