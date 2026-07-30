import {
  isLiveKitMetadata,
  isR2VideoMetadata,
  parseContentMetadata,
} from "@/lib/media/content-metadata";

type CurriculumCourse = Awaited<
  ReturnType<typeof import("@/lib/curriculum-admin").getCourseCurriculum>
>;

export type PublishChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type PublishChecklist = {
  ready: boolean;
  items: PublishChecklistItem[];
};

function lessonContentReady(lesson: CurriculumCourse["modules"][number]["lessons"][number]) {
  switch (lesson.type) {
    case "VIDEO": {
      const hasVideo = lesson.contents.some((content) => {
        if (content.url?.trim()) return true;
        const metadata = parseContentMetadata(content.metadata);
        return isR2VideoMetadata(metadata);
      });
      return { ok: hasVideo, detail: hasVideo ? undefined : "동영상 업로드 필요" };
    }
    case "TEXT": {
      const hasBody = lesson.contents.some((content) => content.body?.trim());
      return { ok: hasBody, detail: hasBody ? undefined : "본문(마크다운) 필요" };
    }
    case "QUIZ": {
      const questionCount = lesson.quiz?._count.questions ?? 0;
      return {
        ok: questionCount > 0,
        detail: questionCount > 0 ? undefined : "퀴즈 문항 1개 이상 필요",
      };
    }
    case "ASSIGNMENT": {
      const ok = Boolean(lesson.assignment?.title?.trim());
      return { ok, detail: ok ? undefined : "과제 설정 필요" };
    }
    case "LIVE": {
      const hasSchedule = lesson.contents.some((content) => {
        const metadata = parseContentMetadata(content.metadata);
        return isLiveKitMetadata(metadata) && Boolean(metadata.scheduledAt?.trim());
      });
      return { ok: hasSchedule, detail: hasSchedule ? undefined : "라이브 시작 일시 필요" };
    }
    default:
      return { ok: false, detail: "지원하지 않는 레슨 타입" };
  }
}

export function buildCoursePublishChecklist(course: CurriculumCourse): PublishChecklist {
  const items: PublishChecklistItem[] = [];

  items.push({
    id: "title",
    label: "코스 제목",
    ok: Boolean(course.title.trim()),
  });

  items.push({
    id: "slug",
    label: "URL 슬러그",
    ok: Boolean(course.slug.trim()),
  });

  items.push({
    id: "modules",
    label: "모듈 1개 이상",
    ok: course.modules.length > 0,
    detail: course.modules.length === 0 ? "모듈을 추가하세요" : undefined,
  });

  const allLessons = course.modules.flatMap((module) => module.lessons);

  items.push({
    id: "lessons",
    label: "레슨 1개 이상",
    ok: allLessons.length > 0,
    detail: allLessons.length === 0 ? "레슨을 추가하세요" : undefined,
  });

  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const readiness = lessonContentReady(lesson);
      items.push({
        id: `lesson-${lesson.id}`,
        label: `${module.title} · ${lesson.title}`,
        ok: readiness.ok,
        detail: readiness.detail,
      });
    }
  }

  return {
    ready: items.every((item) => item.ok),
    items,
  };
}
