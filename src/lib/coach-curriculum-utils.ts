import { lessonTypeLabels } from "@/lib/lesson-labels";
import {
  isLiveKitMetadata,
  isR2VideoMetadata,
  parseContentMetadata,
} from "@/lib/media/content-metadata";

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
  VIDEO: "R2 동영상 업로드",
  TEXT: "마크다운 본문",
  QUIZ: "객관식 퀴즈",
  ASSIGNMENT: "과제 제출",
  LIVE: "LiveKit 라이브",
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
      const ok = lesson.contents.some((content) => {
        if (content.url?.trim()) return true;
        return isR2VideoMetadata(parseContentMetadata(content.metadata as never));
      });
      return { ok, label: ok ? "콘텐츠 준비됨" : "동영상 필요", detail: ok ? undefined : "업로드하세요" };
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
      const liveContent = lesson.contents.find((content) => {
        const metadata = parseContentMetadata(content.metadata as never);
        return isLiveKitMetadata(metadata);
      });
      const metadata = liveContent
        ? parseContentMetadata(liveContent.metadata as never)
        : null;
      const hasSchedule =
        isLiveKitMetadata(metadata) && Boolean(metadata.scheduledAt?.trim());
      return {
        ok: hasSchedule,
        label: hasSchedule ? "라이브 일정 설정됨" : "라이브 일정 필요",
        detail: hasSchedule ? undefined : "시작 일시 등록",
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
