"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GrantEnrollmentPanelProps = {
  users: Array<{ id: string; label: string }>;
  courses: Array<{ id: string; label: string }>;
};

export function GrantEnrollmentPanel({ users, courses }: GrantEnrollmentPanelProps) {
  const router = useRouter();
  const [targetUserId, setTargetUserId] = useState(users[0]?.id ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, courseId }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "부여에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
      <h2 className="font-semibold">수강권 수동 부여</h2>
      <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.label}</option>
        ))}
      </select>
      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? "처리 중..." : "수강권 부여"}
      </button>
    </form>
  );
}
