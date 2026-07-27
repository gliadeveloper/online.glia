"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OfferingEditPanelProps = {
  offeringId: string;
  title: string;
  description: string | null;
  totalSessions: number;
  validDays: number;
  sessionMinutes: number;
  maxQuestions: number | null;
  responseDays: number | null;
  cancelPolicy: unknown;
  refundPolicy: unknown;
};

function stringifyJson(value: unknown) {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export function OfferingEditPanel({
  offeringId,
  title: initialTitle,
  description: initialDescription,
  totalSessions: initialTotalSessions,
  validDays: initialValidDays,
  sessionMinutes: initialSessionMinutes,
  maxQuestions: initialMaxQuestions,
  responseDays: initialResponseDays,
  cancelPolicy,
  refundPolicy,
}: OfferingEditPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [totalSessions, setTotalSessions] = useState(String(initialTotalSessions));
  const [validDays, setValidDays] = useState(String(initialValidDays));
  const [sessionMinutes, setSessionMinutes] = useState(String(initialSessionMinutes));
  const [maxQuestions, setMaxQuestions] = useState(
    initialMaxQuestions != null ? String(initialMaxQuestions) : "",
  );
  const [responseDays, setResponseDays] = useState(
    initialResponseDays != null ? String(initialResponseDays) : "",
  );
  const [cancelPolicyText, setCancelPolicyText] = useState(stringifyJson(cancelPolicy));
  const [refundPolicyText, setRefundPolicyText] = useState(stringifyJson(refundPolicy));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    let parsedCancel: Record<string, unknown> | null = null;
    let parsedRefund: Record<string, unknown> | null = null;

    try {
      if (cancelPolicyText.trim()) {
        parsedCancel = JSON.parse(cancelPolicyText) as Record<string, unknown>;
      }
      if (refundPolicyText.trim()) {
        parsedRefund = JSON.parse(refundPolicyText) as Record<string, unknown>;
      }
    } catch {
      setError("정책 JSON 형식이 올바르지 않습니다.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/coaching-offerings/${offeringId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          totalSessions: Number(totalSessions),
          validDays: Number(validDays),
          sessionMinutes: Number(sessionMinutes),
          maxQuestions: maxQuestions ? Number(maxQuestions) : null,
          responseDays: responseDays ? Number(responseDays) : null,
          cancelPolicy: parsedCancel,
          refundPolicy: parsedRefund,
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
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm"
      >
        상품 편집
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">코칭 상품 편집</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">제목</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">설명</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">회차</span>
                  <input
                    type="number"
                    value={totalSessions}
                    onChange={(event) => setTotalSessions(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">유효일</span>
                  <input
                    type="number"
                    value={validDays}
                    onChange={(event) => setValidDays(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">세션(분)</span>
                  <input
                    type="number"
                    value={sessionMinutes}
                    onChange={(event) => setSessionMinutes(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">질문 한도</span>
                  <input
                    type="number"
                    value={maxQuestions}
                    onChange={(event) => setMaxQuestions(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">응답 SLA (일)</span>
                <input
                  type="number"
                  value={responseDays}
                  onChange={(event) => setResponseDays(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">취소 정책 (JSON)</span>
                <textarea
                  value={cancelPolicyText}
                  onChange={(event) => setCancelPolicyText(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs"
                  placeholder='{"cancelBeforeHours": 24}'
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">환불 정책 (JSON)</span>
                <textarea
                  value={refundPolicyText}
                  onChange={(event) => setRefundPolicyText(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs"
                  placeholder='{"fullRefundDays": 7}'
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                저장
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
