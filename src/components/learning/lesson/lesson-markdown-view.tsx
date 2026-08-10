import { PostMarkdown } from "@/components/community/post-markdown";

import "./lesson-markdown-prose.css";

type LessonMarkdownViewProps = {
  content: string;
  className?: string;
};

/** Lesson body markdown — typography matches instructor editor preview. */
export function LessonMarkdownView({ content, className }: LessonMarkdownViewProps) {
  return (
    <PostMarkdown
      content={content}
      className={["lesson-markdown-prose", className].filter(Boolean).join(" ")}
    />
  );
}
