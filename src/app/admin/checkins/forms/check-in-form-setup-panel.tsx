"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CheckInFormSetupItem } from "@/lib/checkin-admin-setup";

const kindLabels = {
  daily: "데일리 체크인",
  weekly: "주간 체크인",
} as const;

const statusLabels = {
  MISSING: "미등록",
  DRAFT: "초안",
  PUBLISHED: "발행됨",
  ARCHIVED: "아카이브",
} as const;

const statusStyles = {
  MISSING: "bg-amber-50 text-amber-800 ring-amber-200",
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ARCHIVED: "bg-red-50 text-red-700 ring-red-200",
} as const;

type CheckInFormSetupPanelProps = {
  initialItems: CheckInFormSetupItem[];
};

export function CheckInFormSetupPanel({ initialItems }: CheckInFormSetupPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setupForm(kind: "daily" | "weekly") {
    setLoadingKind(kind);
    setError(null);

    try {
      const response = await fetch("/api/admin/checkins/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });

      const data = (await response.json()) as {
        error?: string;
        items?: CheckInFormSetupItem[];
      };

      if (!response.ok) {
        setError(data.error ?? "체크인 폼 등록에 실패했습니다.");
        return;
      }

      if (data.items) {
        setItems(data.items);
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoadingKind(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article
          key={item.kind}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">{kindLabels[item.kind]}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyles[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>
              <p className="font-mono text-sm text-zinc-500">slug: {item.slug}</p>
              <p className="text-sm text-zinc-600">
                고객 앱은 위 slug의 <strong>발행(PUBLISHED)</strong> 폼을 찾습니다. 질문{" "}
                {item.questionCount}개
              </p>
              {!item.isReady && (
                <p className="text-sm text-amber-700">
                  아직 고객 화면에서 「폼이 준비되지 않았습니다」가 표시됩니다.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setupForm(item.kind)}
                disabled={loadingKind !== null}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {loadingKind === item.kind
                  ? "등록 중..."
                  : item.status === "MISSING"
                    ? "기본 템플릿 등록 및 발행"
                    : "기본 템플릿으로 다시 적용"}
              </button>
              {item.formId && (
                <Link
                  href={`/admin/forms/${item.formId}`}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700"
                >
                  폼 상세 보기
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">직접 만들기</p>
        <p className="mt-1">
          slug를 <code className="rounded bg-white px-1">daily-checkin</code> /{" "}
          <code className="rounded bg-white px-1">weekly-checkin</code> 으로 맞추면 일반 폼
          생성으로도 등록할 수 있습니다.
        </p>
        <Link href="/admin/forms/new" className="mt-3 inline-block text-sm font-medium text-violet-600">
          새 폼 만들기 →
        </Link>
      </div>
    </div>
  );
}
