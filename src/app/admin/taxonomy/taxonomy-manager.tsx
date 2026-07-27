"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { courses: number; children: number };
  parent: { id: string; name: string } | null;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  _count: { courses: number };
};

type TaxonomyManagerProps = {
  categories: CategoryRow[];
  tags: TagRow[];
};

export function TaxonomyManager({ categories, tags }: TaxonomyManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, slug: categorySlug }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "카테고리 생성에 실패했습니다.");
        return;
      }

      setCategoryName("");
      setCategorySlug("");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function createTag(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName, slug: tagSlug }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "태그 생성에 실패했습니다.");
        return;
      }

      setTagName("");
      setTagSlug("");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">카테고리</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {categories.map((category) => (
              <li key={category.id} className="px-5 py-4">
                <p className="font-medium">{category.name}</p>
                <p className="font-mono text-xs text-zinc-500">{category.slug}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {category._count.courses} 코스
                  {category.parent ? ` · 상위: ${category.parent.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <form onSubmit={createCategory} className="space-y-3 border-t border-zinc-100 p-5">
            <p className="text-sm font-medium">새 카테고리</p>
            <input
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="이름"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              required
            />
            <input
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              placeholder="slug"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-mono"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              추가
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">태그</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {tags.map((tag) => (
              <li key={tag.id} className="px-5 py-4">
                <p className="font-medium">{tag.name}</p>
                <p className="font-mono text-xs text-zinc-500">{tag.slug}</p>
                <p className="mt-1 text-xs text-zinc-500">{tag._count.courses} 코스</p>
              </li>
            ))}
          </ul>
          <form onSubmit={createTag} className="space-y-3 border-t border-zinc-100 p-5">
            <p className="text-sm font-medium">새 태그</p>
            <input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="이름"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              required
            />
            <input
              value={tagSlug}
              onChange={(event) => setTagSlug(event.target.value)}
              placeholder="slug"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-mono"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              추가
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
