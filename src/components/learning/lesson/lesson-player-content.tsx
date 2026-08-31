import Link from "next/link";

import { LessonContentView } from "@/components/learning/lesson/lesson-content-view";
import { LessonVideoPlayer } from "@/components/learning/lesson/lesson-video-player";
import type { Prisma } from "@/generated/prisma/client";
import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";
import {
  formatLessonMaterialSize,
  lessonMaterialTypeLabel,
  type LessonMaterialPublic,
} from "@/lib/lesson-material-constants";
import { isLessonMarkdownContent } from "@/lib/lesson-markdown-content";
import { isYoutubeUrl } from "@/lib/media/youtube";
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
  lessonId: string;
  materials: LessonMaterialPublic[];
};

export function LessonMaterialsPanel({ lessonId, materials }: LessonMaterialsPanelProps) {
  if (materials.length === 0) {
    return <p className="lesson-player-materials__empty">등록된 수업자료가 없습니다.</p>;
  }

  return (
    <>
      {materials.map((material) => (
        <article key={material.id} className="lesson-player-materials__item">
          <h3 className="lesson-player-materials__title">{material.title}</h3>
          <p className="lesson-player-materials__meta">
            {lessonMaterialTypeLabel(material.contentType, material.originalName)} ·{" "}
            {formatLessonMaterialSize(material.byteSize)}
            {material.title !== material.originalName ? ` · ${material.originalName}` : null}
          </p>
          <a
            href={`/api/learning/lessons/${lessonId}/materials/${material.id}`}
            className="lesson-player-materials__link shell-focus-ring"
          >
            다운로드
          </a>
        </article>
      ))}
    </>
  );
}

type LessonNavFooterProps = {
  courseId: string;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
};

export function LessonNavFooter({ courseId, prevLesson, nextLesson }: LessonNavFooterProps) {
  return (
    <nav aria-label="레슨 이동" className="lesson-player-nav">
      {prevLesson ? (
        <Link
          href={`/learning/${courseId}/lessons/${prevLesson.id}`}
          className="lesson-player-nav__link lesson-player-nav__link--muted shell-focus-ring"
        >
          ← {prevLesson.title}
        </Link>
      ) : null}
      {nextLesson ? (
        <Link
          href={`/learning/${courseId}/lessons/${nextLesson.id}`}
          className="lesson-player-nav__link shell-focus-ring"
        >
          다음: {nextLesson.title} →
        </Link>
      ) : (
        <Link href="/learning" className="lesson-player-nav__link shell-focus-ring">
          내 학습으로
        </Link>
      )}
    </nav>
  );
}
