import { LessonContentView } from "@/components/learning/lesson/lesson-content-view";

type ProductDescriptionViewProps = {
  description: string | null;
  descriptionMetadata?: unknown;
  className?: string;
};

/** Shop / admin preview — BlockNote blocks if saved, otherwise markdown. */
export function ProductDescriptionView({
  description,
  descriptionMetadata,
  className,
}: ProductDescriptionViewProps) {
  return (
    <LessonContentView
      body={description}
      metadata={descriptionMetadata}
      className={className}
    />
  );
}
