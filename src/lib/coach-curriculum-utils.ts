import { lessonTypeLabels } from "@/lib/lesson-labels";
import { isYoutubeUrl } from "@/lib/media/youtube";
import { isZoomUrl } from "@/lib/media/zoom";

export const lessonTypes = ["VIDEO", "TEXT", "QUIZ", "ASSIGNMENT", "LIVE"] as const;
export type LessonTypeValue = (typeof lessonTypes)[number];

export type CurriculumLesson = {
  id: string;
  title: string;
  type: string;
  order: number;
  duration: number | null;
  isFree?: boolean;
  contents: Array<{
    id: string;
    type: string;
    title: string | null;
    url: string | null;
    body?: string | null;
    metadata?: unknown;
  }>;
  quiz: { id: string; title: string; _count: { questions: number } } | null;
  assignment: { id: string; title: string } | null;
};

export type CurriculumModule = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CurriculumLesson[];
};

export const lessonTypeHints: Record<LessonTypeValue, string> = {
  VIDEO: "YouTube 동영상",
  TEXT: "마크다운 본문",
  QUIZ: "객관식 퀴즈",
  ASSIGNMENT: "과제 제출",
  LIVE: "Zoom 라이브",
};

export function curriculumStats(modules: CurriculumModule[]) {
  const lessonCount = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const readyCount = modules.reduce(
    (sum, module) => sum + module.lessons.filter((lesson) => getLessonReadiness(lesson).ok).length,
    0,
  );

  return { moduleCount: modules.length, lessonCount, readyCount };
}

export function getLessonReadiness(lesson: CurriculumLesson): {
  ok: boolean;
  label: string;
  detail?: string;
} {
  switch (lesson.type) {
    case "VIDEO": {
      const ok = lesson.contents.some(
        (content) => content.type === "VIDEO" && isYoutubeUrl(content.url ?? ""),
      );
      return { ok, label: ok ? "YouTube 등록됨" : "YouTube URL 필요", detail: ok ? undefined : "YouTube URL 등록" };
    }
    case "TEXT": {
      const ok = lesson.contents.some((content) => content.body?.trim());
      return { ok, label: ok ? "본문 작성됨" : "본문 필요", detail: ok ? undefined : "마크다운 작성" };
    }
    case "QUIZ": {
      const count = lesson.quiz?._count.questions ?? 0;
      const ok = count > 0;
      return {
        ok,
        label: ok ? `퀴즈 ${count}문항` : "퀴즈 필요",
        detail: ok ? undefined : "문항 추가",
      };
    }
    case "ASSIGNMENT": {
      const ok = Boolean(lesson.assignment?.title?.trim());
      return { ok, label: ok ? "과제 설정됨" : "과제 필요", detail: ok ? undefined : "과제 작성" };
    }
    case "LIVE": {
      const hasZoom = lesson.contents.some((content) => isZoomUrl(content.url));
      return {
        ok: hasZoom,
        label: hasZoom ? "Zoom 링크 등록됨" : "Zoom 링크 필요",
        detail: hasZoom ? undefined : "Zoom URL 등록",
      };
    }
    default:
      return { ok: false, label: "미지원 타입" };
  }
}

export function lessonTypeLabel(type: string) {
  return lessonTypeLabels[type] ?? type;
}

export function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}
