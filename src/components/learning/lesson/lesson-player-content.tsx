import Link from "next/link";

import { LessonContentView } from "@/components/learning/lesson/lesson-content-view";
import { LessonVideoPlayer } from "@/components/learning/lesson/lesson-video-player";
import type { Prisma } from "@/generated/prisma/client";
import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";
import { getLessonMarkdownContent, isLessonMarkdownContent } from "@/lib/lesson-markdown-content";
import { getLessonYoutubeUrl, isYoutubeUrl } from "@/lib/media/youtube";
import { getLessonZoomUrl, isZoomUrl } from "@/lib/media/zoom";

type LessonContent = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
  metadata?: Prisma.JsonValue | null;
};

export function getPrimaryVideoContent(contents: LessonContent[]) {
  return contents.find(
    (content) => content.type === "VIDEO" && isYoutubeUrl(content.url ?? ""),
  );
}

/** 실제 YouTube 플레이어를 렌더할 수 있는지 */
export function lessonHasVideoPlayer(lesson: {
  type: string;
  contents: LessonContent[];
}): boolean {
  if (lesson.type === "VIDEO" || lesson.type === "TEXT") {
    return Boolean(getPrimaryVideoContent(lesson.contents));
  }

  return false;
}

export { getLessonYoutubeUrl } from "@/lib/media/youtube";
export { getLessonZoomUrl } from "@/lib/media/zoom";
export { isZoomUrl };

type LessonVideoHeroProps = {
  lessonTitle: string;
  contents: LessonContent[];
};

export function LessonVideoHero({ lessonTitle, contents }: LessonVideoHeroProps) {
  const videoContent = getPrimaryVideoContent(contents);
  const youtubeUrl = videoContent?.url;

  if (!videoContent || !youtubeUrl || !isYoutubeUrl(youtubeUrl)) {
    return null;
  }

  return (
    <LessonVideoPlayer url={youtubeUrl} title={videoContent.title ?? lessonTitle} />
  );
}

type LessonTextBodyProps = {
  contents: LessonContent[];
  description?: string | null;
};

export function LessonTextBody({ contents, description }: LessonTextBodyProps) {
  const textContent = contents.find((content) => isLessonMarkdownContent(content));

  const hasTextContent =
    Boolean(textContent?.body) || Boolean(getBlockNoteBlocksFromMetadata(textContent?.metadata));

  if (!hasTextContent && !description) {
    return null;
  }

  return (
    <div className="lesson-player-text">
      {hasTextContent && textContent ? (
        <LessonContentView body={textContent.body} metadata={textContent.metadata} />
      ) : null}
      {description ? <p className="lesson-player-text__desc">{description}</p> : null}
    </div>
  );
}

type LessonMaterialsPanelProps = {
  contents: LessonContent[];
  lessonTitle: string;
};

export function LessonMaterialsPanel({ contents, lessonTitle }: LessonMaterialsPanelProps) {
  const mainMarkdown = getLessonMarkdownContent(contents);
  const materials = contents.filter((content) => {
    if (content.type === "VIDEO") return false;
    if (mainMarkdown && content.id === mainMarkdown.id) return false;
    return Boolean(content.body || content.url || content.title);
  });

  if (materials.length === 0) {
    return <p className="lesson-player-materials__empty">등록된 수업자료가 없습니다.</p>;
  }

  return (
    <>
      {materials.map((content) => (
        <article key={content.id} className="lesson-player-materials__item">
          {content.title ? (
            <h3 className="lesson-player-materials__title">{content.title}</h3>
          ) : null}
          {content.body && isLessonMarkdownContent(content) ? (
            <LessonContentView
              body={content.body}
              metadata={content.metadata}
              className="lesson-player-materials__markdown"
            />
          ) : null}
          {content.url ? (
            <a
              href={content.url}
              target="_blank"
              rel="noreferrer"
              className="lesson-player-materials__link shell-focus-ring"
            >
              {content.type === "PDF" ? "PDF 열기" : "자료 열기"} →
            </a>
          ) : null}
        </article>
      ))}
    </>
  );
}

type LessonNavFooterProps = {
  slug: string;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
};

export function LessonNavFooter({ slug, prevLesson, nextLesson }: LessonNavFooterProps) {
  return (
    <nav aria-label="레슨 이동" className="lesson-player-nav">
      {prevLesson ? (
        <Link
          href={`/learning/${slug}/lessons/${prevLesson.id}`}
          className="lesson-player-nav__link lesson-player-nav__link--muted shell-focus-ring"
        >
          ← {prevLesson.title}
        </Link>
      ) : null}
      {nextLesson ? (
        <Link
          href={`/learning/${slug}/lessons/${nextLesson.id}`}
          className="lesson-player-nav__link shell-focus-ring"
        >
          다음: {nextLesson.title} →
        </Link>
      ) : (
        <Link href={`/learning/${slug}`} className="lesson-player-nav__link shell-focus-ring">
          커리큘럼으로 돌아가기
        </Link>
      )}
    </nav>
  );
}
