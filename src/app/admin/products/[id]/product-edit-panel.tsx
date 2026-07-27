"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProductKind } from "@/generated/prisma/client";

type ProductItem = {
  id: string;
  kind: string;
  courseId: string | null;
  coachingOfferingId: string | null;
  course: { id: string; title: string } | null;
  coachingOffering: { id: string; title: string } | null;
};

type Option = { id: string; label: string };

type ProductEditPanelProps = {
  productId: string;
  kind: ProductKind;
  title: string;
  description: string | null;
  listPrice: number;
  salePrice: number | null;
  items: ProductItem[];
  courses: Option[];
  offerings: Option[];
};

export function ProductEditPanel({
  productId,
  kind,
  title: initialTitle,
  description: initialDescription,
  listPrice: initialListPrice,
  salePrice: initialSalePrice,
  items,
  courses,
  offerings,
}: ProductEditPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"meta" | "items">("meta");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [listPrice, setListPrice] = useState(String(initialListPrice));
  const [salePrice, setSalePrice] = useState(
    initialSalePrice != null ? String(initialSalePrice) : "",
  );

  const courseItem = items.find((item) => item.kind === "COURSE_ACCESS");
  const coachingItem = items.find((item) => item.kind === "COACHING_ACCESS");
  const [courseId, setCourseId] = useState(courseItem?.courseId ?? courses[0]?.id ?? "");
  const [offeringId, setOfferingId] = useState(
    coachingItem?.coachingOfferingId ?? offerings[0]?.id ?? "",
  );

  async function saveMeta(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          listPrice: Number(listPrice),
          salePrice: salePrice ? Number(salePrice) : null,
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

  async function saveItems(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const nextItems =
      kind === "COURSE_ONLY"
        ? [{ kind: "COURSE_ACCESS" as const, courseId }]
        : kind === "COACHING_ONLY"
          ? [{ kind: "COACHING_ACCESS" as const, coachingOfferingId: offeringId }]
          : [
              { kind: "COURSE_ACCESS" as const, courseId, sortOrder: 1 },
              { kind: "COACHING_ACCESS" as const, coachingOfferingId: offeringId, sortOrder: 2 },
            ];

    try {
      const response = await fetch(`/api/admin/products/${productId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: nextItems }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "SKU 저장에 실패했습니다.");
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
              <h2 className="text-lg font-semibold">상품 편집</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              {(["meta", "items"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === value ? "bg-violet-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {value === "meta" ? "기본 정보" : "SKU 구성"}
                </button>
              ))}
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            {tab === "meta" ? (
              <form onSubmit={saveMeta} className="space-y-4">
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
                    <span className="font-medium">정가</span>
                    <input
                      type="number"
                      value={listPrice}
                      onChange={(event) => setListPrice(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">할인가</span>
                    <input
                      type="number"
                      value={salePrice}
                      onChange={(event) => setSalePrice(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  저장
                </button>
              </form>
            ) : (
              <form onSubmit={saveItems} className="space-y-4">
                {(kind === "COURSE_ONLY" || kind === "BUNDLE") && (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">코스</span>
                    <select
                      value={courseId}
                      onChange={(event) => setCourseId(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(kind === "COACHING_ONLY" || kind === "BUNDLE") && (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">코칭 상품</span>
                    <select
                      value={offeringId}
                      onChange={(event) => setOfferingId(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                    >
                      {offerings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {offering.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  SKU 저장
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
