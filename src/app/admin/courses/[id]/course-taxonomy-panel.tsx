"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TaxonomyOption = { id: string; name: string; slug: string };

type CourseTaxonomyPanelProps = {
  courseId: string;
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
  selectedCategoryIds: string[];
  selectedTagIds: string[];
};

export function CourseTaxonomyPanel({
  courseId,
  categories,
  tags,
  selectedCategoryIds: initialCategoryIds,
  selectedTagIds: initialTagIds,
}: CourseTaxonomyPanelProps) {
  const router = useRouter();
  const [categoryIds, setCategoryIds] = useState(initialCategoryIds);
  const [tagIds, setTagIds] = useState(initialTagIds);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/taxonomy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds, tagIds }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold">카테고리 · 태그</h2>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div>
        <p className="mb-2 text-sm font-medium">카테고리</p>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            등록된 카테고리가 없습니다.{" "}
            <a href="/admin/taxonomy" className="text-violet-600">
              Taxonomy
            </a>
            에서 추가하세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = categoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryIds((current) => toggleId(current, category.id))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-violet-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">태그</p>
        {tags.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 태그가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setTagIds((current) => toggleId(current, tag.id))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        분류 저장
      </button>
    </form>
  );
}
