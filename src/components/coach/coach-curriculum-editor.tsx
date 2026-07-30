"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CoachConfirmDialog } from "@/components/coach/coach-confirm-dialog";
import {
  type CurriculumModule,
  type LessonTypeValue,
  curriculumStats,
  getLessonReadiness,
  lessonTypeHints,
  lessonTypeLabel,
  lessonTypes,
  sortByOrder,
} from "@/lib/coach-curriculum-utils";

type CoachCurriculumEditorProps = {
  courseId: string;
  modules: CurriculumModule[];
};

type ConfirmState = {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
};

export function CoachCurriculumEditor({ courseId, modules: initialModules }: CoachCurriculumEditorProps) {
  const router = useRouter();
  const modules = useMemo(() => sortByOrder(initialModules), [initialModules]);
  const stats = curriculumStats(modules);

  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(modules.map((module) => module.id)),
  );
  const [showAddModule, setShowAddModule] = useState(false);
  const [addingLessonModuleId, setAddingLessonModuleId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editModuleDescription, setEditModuleDescription] = useState("");

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<LessonTypeValue>("VIDEO");
  const [newLessonDuration, setNewLessonDuration] = useState("");
  const [newLessonFree, setNewLessonFree] = useState(false);

  async function apiCall(url: string, method: string, body?: object) {
    setBusyKey(url);
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
      setBusyKey(null);
    }
  }

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function startEditModule(module: CurriculumModule) {
    setEditingModuleId(module.id);
    setEditModuleTitle(module.title);
    setEditModuleDescription(module.description ?? "");
    setExpandedModules((prev) => new Set(prev).add(module.id));
  }

  async function saveModuleEdit(moduleId: string) {
    const ok = await apiCall(`/api/coach/courses/${courseId}/modules/${moduleId}`, "PATCH", {
      title: editModuleTitle,
      description: editModuleDescription || undefined,
    });
    if (ok) setEditingModuleId(null);
  }

  async function createModule(event: React.FormEvent) {
    event.preventDefault();
    if (!newModuleTitle.trim()) return;

    const ok = await apiCall(`/api/coach/courses/${courseId}/modules`, "POST", {
      title: newModuleTitle,
      description: newModuleDescription || undefined,
    });

    if (ok) {
      setNewModuleTitle("");
      setNewModuleDescription("");
      setShowAddModule(false);
    }
  }

  async function createLesson(event: React.FormEvent, moduleId: string) {
    event.preventDefault();
    if (!newLessonTitle.trim()) return;

    const ok = await apiCall(`/api/coach/modules/${moduleId}/lessons`, "POST", {
      title: newLessonTitle,
      type: newLessonType,
      duration: newLessonDuration ? Number(newLessonDuration) : undefined,
      isFree: newLessonFree,
    });

    if (ok) {
      setNewLessonTitle("");
      setNewLessonType("VIDEO");
      setNewLessonDuration("");
      setNewLessonFree(false);
      setAddingLessonModuleId(null);
    }
  }

  async function moveModule(moduleId: string, direction: "up" | "down") {
    const sorted = sortByOrder(modules);
    const index = sorted.findIndex((module) => module.id === moduleId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const target = sorted[swapIndex];

    setBusyKey(`move-module-${moduleId}`);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/coach/courses/${courseId}/modules/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: target.order }),
        }),
        fetch(`/api/coach/courses/${courseId}/modules/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: current.order }),
        }),
      ]);

      if (!a.ok || !b.ok) {
        setError("순서 변경에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusyKey(null);
    }
  }

  async function moveLesson(moduleId: string, lessonId: string, direction: "up" | "down") {
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;

    const sorted = sortByOrder(module.lessons);
    const index = sorted.findIndex((lesson) => lesson.id === lessonId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const target = sorted[swapIndex];

    setBusyKey(`move-lesson-${lessonId}`);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/coach/lessons/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: target.order }),
        }),
        fetch(`/api/coach/lessons/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: current.order }),
        }),
      ]);

      if (!a.ok || !b.ok) {
        setError("레슨 순서 변경에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusyKey(null);
    }
  }

  function requestDeleteModule(module: CurriculumModule) {
    setConfirm({
      title: "모듈 삭제",
      description: `「${module.title}」 모듈과 포함된 레슨 ${module.lessons.length}개가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        const ok = await apiCall(`/api/coach/courses/${courseId}/modules/${module.id}`, "DELETE");
        if (ok) setConfirm(null);
      },
    });
  }

  function requestDeleteLesson(lessonTitle: string, lessonId: string) {
    setConfirm({
      title: "레슨 삭제",
      description: `「${lessonTitle}」 레슨을 삭제하시겠습니까? 콘텐츠와 평가 데이터도 함께 제거됩니다.`,
      onConfirm: async () => {
        const ok = await apiCall(`/api/coach/lessons/${lessonId}`, "DELETE");
        if (ok) setConfirm(null);
      },
    });
  }

  const isBusy = busyKey !== null;

  return (
    <div className="coach-curriculum space-y-5">
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-zinc-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">커리큘럼</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              모듈 {stats.moduleCount} · 레슨 {stats.lessonCount} · 준비 {stats.readyCount}/
              {stats.lessonCount || 0}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddModule((value) => !value);
              setAddingLessonModuleId(null);
            }}
            disabled={isBusy}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {showAddModule ? "닫기" : "+ 모듈 추가"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {showAddModule && (
        <form
          onSubmit={createModule}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm"
        >
          <h3 className="font-semibold text-zinc-900">새 모듈</h3>
          <p className="mt-1 text-sm text-zinc-600">챕터 단위로 레슨을 묶습니다.</p>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-zinc-700">모듈 제목</span>
              <input
                value={newModuleTitle}
                onChange={(event) => setNewModuleTitle(event.target.value)}
                required
                autoFocus
                placeholder="예: 1주차 — 기초 다지기"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-zinc-700">설명 (선택)</span>
              <textarea
                value={newModuleDescription}
                onChange={(event) => setNewModuleDescription(event.target.value)}
                rows={2}
                placeholder="이 모듈에서 다루는 내용"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              모듈 만들기
            </button>
            <button
              type="button"
              onClick={() => setShowAddModule(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
          <p className="text-base font-medium text-zinc-800">아직 모듈이 없습니다</p>
          <p className="mt-2 text-sm text-zinc-500">
            모듈을 추가한 뒤 VIDEO · TEXT · QUIZ · LIVE 레슨을 구성하세요.
          </p>
          {!showAddModule && (
            <button
              type="button"
              onClick={() => setShowAddModule(true)}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              첫 모듈 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => {
            const expanded = expandedModules.has(module.id);
            const sortedLessons = sortByOrder(module.lessons);
            const isEditing = editingModuleId === module.id;

            return (
              <section
                key={module.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <header className="border-b border-zinc-100 bg-zinc-50/80">
                  <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      aria-expanded={expanded}
                      className="mt-1 rounded-lg p-1 text-zinc-500 hover:bg-zinc-200/60"
                    >
                      <span className="inline-block text-xs transition-transform" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                        ▶
                      </span>
                    </button>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            value={editModuleTitle}
                            onChange={(event) => setEditModuleTitle(event.target.value)}
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium"
                          />
                          <textarea
                            value={editModuleDescription}
                            onChange={(event) => setEditModuleDescription(event.target.value)}
                            rows={2}
                            placeholder="모듈 설명"
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveModuleEdit(module.id)}
                              disabled={isBusy}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModuleId(null)}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                              Module {module.order}
                            </span>
                            <span className="text-xs text-zinc-500">{sortedLessons.length} 레슨</span>
                          </div>
                          <h3 className="mt-1 text-base font-semibold text-zinc-900">{module.title}</h3>
                          {module.description && (
                            <p className="mt-1 text-sm text-zinc-600">{module.description}</p>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton
                          label="위로"
                          disabled={isBusy || moduleIndex === 0}
                          onClick={() => moveModule(module.id, "up")}
                        >
                          ↑
                        </IconButton>
                        <IconButton
                          label="아래로"
                          disabled={isBusy || moduleIndex === modules.length - 1}
                          onClick={() => moveModule(module.id, "down")}
                        >
                          ↓
                        </IconButton>
                        <IconButton label="편집" disabled={isBusy} onClick={() => startEditModule(module)}>
                          ✎
                        </IconButton>
                        <IconButton
                          label="삭제"
                          disabled={isBusy}
                          onClick={() => requestDeleteModule(module)}
                          destructive
                        >
                          ×
                        </IconButton>
                      </div>
                    )}
                  </div>
                </header>

                {expanded && (
                  <div className="px-4 py-3 sm:px-5">
                    {sortedLessons.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                        레슨이 없습니다. 아래에서 추가하세요.
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-100">
                        {sortedLessons.map((lesson, lessonIndex) => {
                          const readiness = getLessonReadiness(lesson);

                          return (
                            <li key={lesson.id} className="flex items-start gap-3 py-3">
                              <div className="flex shrink-0 flex-col gap-0.5 pt-1">
                                <IconButton
                                  label="레슨 위로"
                                  disabled={isBusy || lessonIndex === 0}
                                  onClick={() => moveLesson(module.id, lesson.id, "up")}
                                >
                                  ↑
                                </IconButton>
                                <IconButton
                                  label="레슨 아래로"
                                  disabled={isBusy || lessonIndex === sortedLessons.length - 1}
                                  onClick={() => moveLesson(module.id, lesson.id, "down")}
                                >
                                  ↓
                                </IconButton>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="coach-curriculum-type-chip">{lessonTypeLabel(lesson.type)}</span>
                                  {lesson.isFree && (
                                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                                      무료 공개
                                    </span>
                                  )}
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      readiness.ok
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-800"
                                    }`}
                                  >
                                    {readiness.label}
                                  </span>
                                </div>
                                <Link
                                  href={`/coach/lessons/${lesson.id}`}
                                  className="mt-1 block font-medium text-zinc-900 hover:text-emerald-800"
                                >
                                  {lesson.title}
                                </Link>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {lesson.duration ? `${lesson.duration}분 · ` : ""}
                                  {readiness.detail ?? "콘텐츠 편집으로 이동"}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <Link
                                  href={`/coach/lessons/${lesson.id}`}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  편집
                                </Link>
                                <IconButton
                                  label="레슨 삭제"
                                  disabled={isBusy}
                                  onClick={() => requestDeleteLesson(lesson.title, lesson.id)}
                                  destructive
                                >
                                  ×
                                </IconButton>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {addingLessonModuleId === module.id ? (
                      <form
                        onSubmit={(event) => createLesson(event, module.id)}
                        className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4"
                      >
                        <h4 className="text-sm font-semibold text-zinc-900">레슨 추가</h4>
                        <label className="mt-3 block space-y-1.5 text-sm">
                          <span className="font-medium text-zinc-700">레슨 제목</span>
                          <input
                            value={newLessonTitle}
                            onChange={(event) => setNewLessonTitle(event.target.value)}
                            required
                            autoFocus
                            placeholder="예: 1강. 소개"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                          />
                        </label>

                        <fieldset className="mt-3">
                          <legend className="text-sm font-medium text-zinc-700">레슨 타입</legend>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {lessonTypes.map((type) => (
                              <label
                                key={type}
                                className={`cursor-pointer rounded-xl border px-3 py-3 transition ${
                                  newLessonType === type
                                    ? "border-emerald-500 bg-white ring-2 ring-emerald-100"
                                    : "border-zinc-200 bg-white hover:border-zinc-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`lesson-type-${module.id}`}
                                  value={type}
                                  checked={newLessonType === type}
                                  onChange={() => setNewLessonType(type)}
                                  className="sr-only"
                                />
                                <span className="block text-sm font-semibold text-zinc-900">
                                  {lessonTypeLabel(type)}
                                </span>
                                <span className="mt-0.5 block text-xs text-zinc-500">
                                  {lessonTypeHints[type]}
                                </span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-1.5 text-sm">
                            <span className="font-medium text-zinc-700">예상 시간 (분)</span>
                            <input
                              type="number"
                              min={1}
                              value={newLessonDuration}
                              onChange={(event) => setNewLessonDuration(event.target.value)}
                              placeholder="선택"
                              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                            />
                          </label>
                          <label className="flex items-end gap-2 pb-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newLessonFree}
                              onChange={(event) => setNewLessonFree(event.target.checked)}
                            />
                            <span className="text-zinc-700">미리보기(무료 공개)</span>
                          </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="submit"
                            disabled={isBusy}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            레슨 만들기
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingLessonModuleId(null)}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600"
                          >
                            취소
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingLessonModuleId(module.id);
                          setShowAddModule(false);
                        }}
                        disabled={isBusy}
                        className="mt-4 w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 disabled:opacity-60"
                      >
                        + 레슨 추가
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <CoachConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel="삭제"
        destructive
        busy={isBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm()}
      />
    </div>
  );
}

type IconButtonProps = {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
};

function IconButton({ label, children, disabled, destructive, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-40 ${
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
