"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; label: string };

type CreateOfferingPanelProps = {
  coaches: Option[];
  courses: Option[];
};

export function CreateOfferingPanel({ coaches, courses }: CreateOfferingPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [totalSessions, setTotalSessions] = useState("3");
  const [validDays, setValidDays] = useState("30");
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/coaching-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          totalSessions: Number(totalSessions),
          validDays: Number(validDays),
          coachId: coachId || undefined,
          courseId: courseId || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }

      router.push(`/admin/coaching-offerings/${data.id}`);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">회차</span>
          <input value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)} type="number" required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">유효일</span>
          <input value={validDays} onChange={(e) => setValidDays(e.target.value)} type="number" required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
      </div>
      <label className="block space-y-2 text-sm">
        <span className="font-medium">코치</span>
        <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>{coach.label}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium">연결 코스 (선택)</span>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
          <option value="">없음</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.label}</option>
          ))}
        </select>
      </label>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? "생성 중..." : "코칭 상품 생성"}
      </button>
    </form>
  );
}
