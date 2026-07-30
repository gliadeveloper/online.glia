"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getProductDisplayPrice, productKindLabels } from "@/lib/customer-labels";
import type { ProductKind } from "@/generated/prisma/client";

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  kind: ProductKind;
  listPrice: number;
  salePrice: number | null;
  isActive: boolean;
  _count: { orderLines: number };
  items: Array<{
    course: { title: string } | null;
    coachingOffering: { title: string } | null;
  }>;
};

type Option = { id: string; label: string };

export function CoachProductList({ products }: { products: ProductRow[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
        <p className="font-medium text-zinc-800">등록된 상품이 없습니다</p>
        <Link
          href="/coach/products/new"
          className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          첫 상품 만들기
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/coach/products/${product.id}`}
            className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-zinc-900">{product.title}</p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  {productKindLabels[product.kind]}
                </span>
                {!product.isActive && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    비활성
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                /shop/{product.slug} · 주문 {product._count.orderLines}건
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {product.items
                  .map((item) => item.course?.title ?? item.coachingOffering?.title)
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="text-sm font-semibold text-zinc-900">
              {getProductDisplayPrice(product).toLocaleString("ko-KR")}원
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type CoachCreateProductFormProps = {
  courses: Option[];
  offerings: Option[];
};

export function CoachCreateProductForm({ courses, offerings }: CoachCreateProductFormProps) {
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
      const response = await fetch("/api/coach/products", {
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
      if (!response.ok || !data.id) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }

      router.push(`/coach/products/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <label className="block space-y-2 text-sm">
        <span className="font-medium">상품 종류</span>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as ProductKind)}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3"
        >
          <option value="COURSE_ONLY">LMS (VOD)</option>
          <option value="COACHING_ONLY">코칭권</option>
          <option value="BUNDLE">LMS + 코칭 번들</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">제목</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">설명</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">정가 (원)</span>
          <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">할인가 (선택)</span>
          <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>
      </div>

      {(kind === "COURSE_ONLY" || kind === "BUNDLE") && (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">연결 코스</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3">
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.label}</option>
            ))}
          </select>
        </label>
      )}

      {(kind === "COACHING_ONLY" || kind === "BUNDLE") && (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">연결 코칭 상품</span>
          <select value={offeringId} onChange={(e) => setOfferingId(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-4 py-3">
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>{offering.label}</option>
            ))}
          </select>
        </label>
      )}

      <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? "생성 중…" : "상품 생성"}
      </button>
    </form>
  );
}

type CoachProductEditPanelProps = {
  productId: string;
  slug: string;
  kind: ProductKind;
  title: string;
  description: string | null;
  listPrice: number;
  salePrice: number | null;
  isActive: boolean;
  items: Array<{
    kind: string;
    courseId: string | null;
    coachingOfferingId: string | null;
  }>;
  courses: Option[];
  offerings: Option[];
};

export function CoachProductEditPanel(props: CoachProductEditPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description ?? "");
  const [listPrice, setListPrice] = useState(String(props.listPrice));
  const [salePrice, setSalePrice] = useState(props.salePrice != null ? String(props.salePrice) : "");
  const [isActive, setIsActive] = useState(props.isActive);
  const [courseId, setCourseId] = useState(
    props.items.find((item) => item.kind === "COURSE_ACCESS")?.courseId ?? props.courses[0]?.id ?? "",
  );
  const [offeringId, setOfferingId] = useState(
    props.items.find((item) => item.kind === "COACHING_ACCESS")?.coachingOfferingId ??
      props.offerings[0]?.id ??
      "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveAll(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const nextItems =
      props.kind === "COURSE_ONLY"
        ? [{ kind: "COURSE_ACCESS" as const, courseId }]
        : props.kind === "COACHING_ONLY"
          ? [{ kind: "COACHING_ACCESS" as const, coachingOfferingId: offeringId }]
          : [
              { kind: "COURSE_ACCESS" as const, courseId, sortOrder: 1 },
              { kind: "COACHING_ACCESS" as const, coachingOfferingId: offeringId, sortOrder: 2 },
            ];

    try {
      const [metaRes, itemsRes] = await Promise.all([
        fetch(`/api/coach/products/${props.productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            listPrice: Number(listPrice),
            salePrice: salePrice ? Number(salePrice) : null,
            isActive,
          }),
        }),
        fetch(`/api/coach/products/${props.productId}/items`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: nextItems }),
        }),
      ]);

      const metaData = (await metaRes.json()) as { error?: string };
      const itemsData = (await itemsRes.json()) as { error?: string };

      if (!metaRes.ok || !itemsRes.ok) {
        setError(metaData.error ?? itemsData.error ?? "저장에 실패했습니다.");
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm">
        <p className="font-medium text-zinc-800">{productKindLabels[props.kind]}</p>
        <p className="mt-1 text-zinc-500">/shop/{props.slug}</p>
      </div>

      <form onSubmit={saveAll} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <label className="block space-y-2 text-sm">
          <span className="font-medium">제목</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">설명</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">정가</span>
            <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">할인가</span>
            <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>샵에 노출 (활성)</span>
        </label>

        {(props.kind === "COURSE_ONLY" || props.kind === "BUNDLE") && (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">연결 코스</span>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
              {props.courses.map((course) => (
                <option key={course.id} value={course.id}>{course.label}</option>
              ))}
            </select>
          </label>
        )}

        {(props.kind === "COACHING_ONLY" || props.kind === "BUNDLE") && (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">연결 코칭</span>
            <select value={offeringId} onChange={(e) => setOfferingId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3">
              {props.offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>{offering.label}</option>
              ))}
            </select>
          </label>
        )}

        <button type="submit" disabled={busy} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          저장
        </button>
      </form>
    </div>
  );
}
