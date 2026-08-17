"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { courseLevelLabels, courseStatusLabels } from "@/lib/course-labels";
import type { CourseLevel } from "@/generated/prisma/client";

type CoachCreateCourseFormProps = {
  onCreated?: (courseId: string) => void;
};

export function CoachCreateCourseForm({ onCreated }: CoachCreateCourseFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<CourseLevel>("ALL_LEVELS");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/coach/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          level,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "코스 생성에 실패했습니다.");
        return;
      }

      onCreated?.(data.id);
      router.push(`/coach/courses/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">새 코스 만들기</h2>
        <p className="mt-1 text-sm text-zinc-500">발행 전까지는 수강생에게 노출되지 않습니다.</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-700">제목</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          placeholder="예: 30일 습관 코칭 기초"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-700">설명</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-700">난이도</span>
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as CourseLevel)}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3"
        >
          {Object.entries(courseLevelLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? "생성 중…" : "코스 생성"}
        </button>
        <Link
          href="/coach/courses"
          className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          취소
        </Link>
      </div>
    </form>
  );
}

type CourseRow = {
  id: string;
  title: string;
  status: keyof typeof courseStatusLabels;
  moduleCount: number;
  lessonCount: number;
  updatedAt: string;
};

type CoachCourseListProps = {
  courses: CourseRow[];
};

export function CoachCourseList({ courses }: CoachCourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-sm text-zinc-500">아직 만든 코스가 없습니다.</p>
        <Link
          href="/coach/courses/new"
          className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          첫 코스 만들기
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {courses.map((course) => (
        <li key={course.id}>
          <Link
            href={`/coach/courses/${course.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50"
          >
            <div>
              <p className="font-medium text-zinc-900">{course.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {courseStatusLabels[course.status]} · 모듈 {course.moduleCount} · 레슨 {course.lessonCount}
              </p>
            </div>
            <span className="text-xs text-zinc-400">
              {new Date(course.updatedAt).toLocaleDateString("ko-KR")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
