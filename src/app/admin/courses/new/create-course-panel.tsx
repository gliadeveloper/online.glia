"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Instructor = { id: string; label: string };

type CreateCoursePanelProps = {
  instructors: Instructor[];
};

export function CreateCoursePanel({ instructors }: CreateCoursePanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [instructorId, setInstructorId] = useState(instructors[0]?.id ?? "");
  const [publish, setPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          description: description || undefined,
          instructorId,
          publish,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }

      router.push(`/admin/courses/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
      <label className="block space-y-2 text-sm">
        <span className="font-medium">제목</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium">Slug</span>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium">설명</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium">강사</span>
        <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>{instructor.label}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        생성 즉시 발행
      </label>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? "생성 중..." : "코스 생성"}
      </button>
    </form>
  );
}
