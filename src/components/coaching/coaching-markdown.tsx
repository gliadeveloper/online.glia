import { LessonContentView } from "@/components/learning/lesson/lesson-content-view";

type CoachingMarkdownProps = {
  body: string | null;
  bodyMetadata?: unknown;
  className?: string;
};

export function CoachingMarkdown({ body, bodyMetadata, className }: CoachingMarkdownProps) {
  return <LessonContentView body={body} metadata={bodyMetadata} className={className} />;
}
