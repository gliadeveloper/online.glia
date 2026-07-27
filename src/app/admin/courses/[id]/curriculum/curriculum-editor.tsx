"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const lessonTypes = ["VIDEO", "TEXT", "QUIZ", "ASSIGNMENT"] as const;

type ModuleData = {
  id: string;
  title: string;
  order: number;
  lessons: Array<{
    id: string;
    title: string;
    type: string;
    order: number;
    duration: number | null;
    contents: Array<{ id: string; type: string; title: string | null; url: string | null }>;
    quiz: { id: string; title: string; _count: { questions: number } } | null;
    assignment: { id: string; title: string } | null;
  }>;
};

type CurriculumEditorProps = {
  courseId: string;
  modules: ModuleData[];
};

export function CurriculumEditor({ courseId, modules: initialModules }: CurriculumEditorProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function apiCall(url: string, method: string, body?: object) {
    setBusy(url);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("네트워크 오류");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function addModule() {
    const title = prompt("모듈 제목");
    if (!title?.trim()) return;
    await apiCall(`/api/admin/courses/${courseId}/modules`, "POST", { title });
  }

  async function addLesson(moduleId: string) {
    const title = prompt("레슨 제목");
    if (!title?.trim()) return;

    const typeInput = prompt("레슨 타입 (VIDEO, TEXT, QUIZ, ASSIGNMENT)", "VIDEO");
    const type = lessonTypes.includes(typeInput as (typeof lessonTypes)[number])
      ? typeInput
      : "VIDEO";

    await apiCall(`/api/admin/modules/${moduleId}/lessons`, "POST", { title, type });
  }

  async function addContent(lessonId: string) {
    const url = prompt("콘텐츠 URL (VOD)");
    if (!url?.trim()) return;
    await apiCall(`/api/admin/lessons/${lessonId}/contents`, "POST", {
      type: "VIDEO",
      title: "Video",
      url,
    });
  }

  function assessmentLabel(lesson: ModuleData["lessons"][number]) {
    if (lesson.type === "QUIZ" && lesson.quiz) {
      return `퀴즈 · ${lesson.quiz._count.questions}문항`;
    }
    if (lesson.type === "ASSIGNMENT" && lesson.assignment) {
      return `과제 · ${lesson.assignment.title}`;
    }
    if (lesson.type === "QUIZ" || lesson.type === "ASSIGNMENT") {
      return "평가 설정 필요";
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">커리큘럼 편집</h2>
        <button
          type="button"
          onClick={addModule}
          disabled={busy !== null}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          + 모듈
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {initialModules.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          모듈이 없습니다. 첫 모듈을 추가하세요.
        </p>
      ) : (
        initialModules.map((module) => (
          <div key={module.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <p className="text-xs text-zinc-500">Module {module.order}</p>
                <h3 className="font-medium">{module.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => addLesson(module.id)}
                className="text-sm font-medium text-violet-600"
              >
                + 레슨
              </button>
            </div>
            <ul className="divide-y divide-zinc-100">
              {module.lessons.map((lesson) => {
                const assessment = assessmentLabel(lesson);
                return (
                  <li key={lesson.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/admin/lessons/${lesson.id}`}
                          className="font-medium text-violet-700 hover:underline"
                        >
                          {lesson.title}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {lesson.type} · {lesson.duration ? `${lesson.duration}분` : "—"}
                        </p>
                        {assessment && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">{assessment}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {(lesson.type === "QUIZ" || lesson.type === "ASSIGNMENT") && (
                          <Link
                            href={`/admin/lessons/${lesson.id}`}
                            className="text-xs font-medium text-violet-600"
                          >
                            평가 편집
                          </Link>
                        )}
                        {(lesson.type === "VIDEO" || lesson.type === "TEXT") && (
                          <button
                            type="button"
                            onClick={() => addContent(lesson.id)}
                            className="text-xs font-medium text-violet-600"
                          >
                            + 콘텐츠
                          </button>
                        )}
                      </div>
                    </div>
                    {lesson.contents.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {lesson.contents.map((content) => (
                          <li
                            key={content.id}
                            className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600"
                          >
                            {content.type}: {content.title ?? content.url ?? content.id.slice(0, 8)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
