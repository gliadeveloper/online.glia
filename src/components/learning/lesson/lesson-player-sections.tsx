import Link from "next/link";

import { lessonTypeLabels } from "@/lib/lesson-labels";

type LessonContent = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
};

type LessonContentSectionProps = {
  lessonTitle: string;
  contents: LessonContent[];
};

export function LessonContentSection({ lessonTitle, contents }: LessonContentSectionProps) {
  return (
    <section className="space-y-4" aria-label="학습 콘텐츠">
      {contents.map((content) => (
        <article
          key={content.id}
          className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm"
        >
          {content.type === "VIDEO" && content.url && (
            <div className="aspect-video bg-zinc-950">
              <iframe
                src={content.url}
                title={content.title ?? lessonTitle}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          )}
          <div className="p-6">
            {content.title && (
              <h2 className="font-medium text-[var(--color-text-primary)]">{content.title}</h2>
            )}
            {content.body && (
              <div
                className="prose prose-zinc mt-3 max-w-none typo-subTypography11 text-[var(--color-text-secondary)]"
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
            )}
            {content.url && content.type !== "VIDEO" && (
              <a
                href={content.url}
                target="_blank"
                rel="noreferrer"
                className="shell-focus-ring mt-3 inline-flex min-h-11 items-center typo-subTypography11 font-medium text-[var(--color-action-primary)]"
              >
                자료 열기 →
              </a>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

type LessonNavFooterProps = {
  slug: string;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
};

export function LessonNavFooter({ slug, prevLesson, nextLesson }: LessonNavFooterProps) {
  return (
    <nav
      aria-label="레슨 이동"
      className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      {prevLesson ? (
        <Link
          href={`/learning/${slug}/lessons/${prevLesson.id}`}
          className="shell-focus-ring inline-flex min-h-11 items-center typo-subTypography11 font-medium text-[var(--color-action-primary)]"
        >
          ← {prevLesson.title}
        </Link>
      ) : (
        <span />
      )}
      {nextLesson ? (
        <Link
          href={`/learning/${slug}/lessons/${nextLesson.id}`}
          className="shell-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 typo-subTypography11 font-medium text-white hover:bg-[var(--color-action-primary-hover)] sm:justify-start"
        >
          다음: {nextLesson.title} →
        </Link>
      ) : (
        <Link
          href={`/learning/${slug}`}
          className="shell-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 typo-subTypography11 font-medium text-[var(--color-text-primary)]"
        >
          커리큘럼으로
        </Link>
      )}
    </nav>
  );
}

type LessonPlayerHeaderProps = {
  moduleTitle: string;
  lessonType: string;
  lessonTitle: string;
  description: string | null;
  statusPill: React.ReactNode;
};

export function LessonPlayerHeader({
  moduleTitle,
  lessonType,
  lessonTitle,
  description,
  statusPill,
}: LessonPlayerHeaderProps) {
  const typeLabel = lessonTypeLabels[lessonType] ?? lessonType;

  return (
    <header>
      <p className="typo-subTypography12 text-[var(--color-text-secondary)]">
        {moduleTitle} · {typeLabel}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="hidden typo-subTypography5 font-semibold text-[var(--color-text-primary)] lg:block">
          {lessonTitle}
        </h1>
        {statusPill}
      </div>
      {description && (
        <p className="mt-3 typo-subTypography11 text-[var(--color-text-secondary)]">{description}</p>
      )}
    </header>
  );
}
