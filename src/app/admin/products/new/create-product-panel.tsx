"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProductKind } from "@/generated/prisma/client";

type Option = { id: string; label: string };

type CreateProductPanelProps = {
  courses: Option[];
  offerings: Option[];
};

export function CreateProductPanel({ courses, offerings }: CreateProductPanelProps) {
  const router = useRouter();
  const [kind, setKind] = useState<ProductKind>("COURSE_ONLY");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listPrice, setListPrice] = useState("99000");
  const [salePrice, setSalePrice] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const items =
      kind === "COURSE_ONLY"
        ? [{ kind: "COURSE_ACCESS" as const, courseId }]
        : kind === "COACHING_ONLY"
          ? [{ kind: "COACHING_ACCESS" as const, coachingOfferingId: offeringId }]
          : [
              { kind: "COURSE_ACCESS" as const, courseId, sortOrder: 1 },
              { kind: "COACHING_ACCESS" as const, coachingOfferingId: offeringId, sortOrder: 2 },
            ];

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          description: description || undefined,
          kind,
          listPrice: Number(listPrice),
          salePrice: salePrice ? Number(salePrice) : undefined,
          activate: true,
          items,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }

      router.push(`/admin/products/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm sm:col-span-2">
          <span className="font-medium">종류</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as ProductKind)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          >
            <option value="COURSE_ONLY">VOD 단품</option>
            <option value="COACHING_ONLY">코칭 단품</option>
            <option value="BUNDLE">번들</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">제목</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm sm:col-span-2">
          <span className="font-medium">설명</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">정가 (원)</span>
          <input value={listPrice} onChange={(e) => setListPrice(e.target.value)} required type="number" className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">할인가 (원, 선택)</span>
          <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} type="number" className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        {(kind === "COURSE_ONLY" || kind === "BUNDLE") && (
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="font-medium">코스</span>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.label}</option>
              ))}
            </select>
          </label>
        )}
        {(kind === "COACHING_ONLY" || kind === "BUNDLE") && (
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="font-medium">코칭 상품</span>
            <select value={offeringId} onChange={(e) => setOfferingId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>{offering.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? "생성 중..." : "상품 생성"}
      </button>
    </form>
  );
}
