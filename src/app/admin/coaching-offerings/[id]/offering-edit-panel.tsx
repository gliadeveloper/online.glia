"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OfferingEditPanelProps = {
  offeringId: string;
  title: string;
  description: string | null;
  totalSessions: number;
  validDays: number;
};

export function OfferingEditPanel({
  offeringId,
  title: initialTitle,
  description: initialDescription,
  totalSessions: initialTotalSessions,
  validDays: initialValidDays,
}: OfferingEditPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [totalSessions, setTotalSessions] = useState(String(initialTotalSessions));
  const [validDays, setValidDays] = useState(String(initialValidDays));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/coaching-offerings/${offeringId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          totalSessions: Number(totalSessions),
          validDays: Number(validDays),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
      >
        편집
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">코칭 상품 편집</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium">제목</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">회차</label>
                <input
                  type="number"
                  min={1}
                  value={totalSessions}
                  onChange={(event) => setTotalSessions(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">유효기간(일)</label>
                <input
                  type="number"
                  min={1}
                  value={validDays}
                  onChange={(event) => setValidDays(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
