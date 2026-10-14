"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProductOption = { id: string; title: string };

export type CouponFormValues = {
  name: string;
  discountType: "FIXED" | "PERCENT";
  discountAmount: string;
  discountPercent: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  issueStartsAt: string;
  issueEndsAt: string;
  validityKind: "RANGE" | "DAYS_FROM_ISSUE";
  validStartsAt: string;
  validEndsAt: string;
  validDays: string;
  issueLimit: string;
  productIds: string[];
  isActive: boolean;
};

type CouponFormProps = {
  products: ProductOption[];
  initial?: CouponFormValues;
  couponId?: string;
  issuedCount?: number;
  apiBase?: string;
  redirectTo?: string;
  productsEmptyLabel?: string;
};

const fieldClass = "w-full rounded-xl border border-zinc-200 px-4 py-3";

export function CouponForm({
  products,
  initial,
  couponId,
  issuedCount = 0,
  apiBase = "/api/admin/coupons",
  redirectTo = "/admin/coupons",
  productsEmptyLabel = "등록된 상품이 없습니다.",
}: CouponFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CouponFormValues>(
    initial ?? {
      name: "",
      discountType: "FIXED",
      discountAmount: "10000",
      discountPercent: "10",
      maxDiscountAmount: "",
      minOrderAmount: "0",
      issueStartsAt: "",
      issueEndsAt: "",
      validityKind: "DAYS_FROM_ISSUE",
      validStartsAt: "",
      validEndsAt: "",
      validDays: "7",
      issueLimit: "",
      productIds: [],
      isActive: true,
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function patch(partial: Partial<CouponFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(couponId ? `${apiBase}/${couponId}` : apiBase, {
        method: couponId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          discountAmount: values.discountAmount === "" ? null : Number(values.discountAmount),
          discountPercent: values.discountPercent === "" ? null : Number(values.discountPercent),
          maxDiscountAmount: values.maxDiscountAmount === "" ? null : Number(values.maxDiscountAmount),
          minOrderAmount: Number(values.minOrderAmount || 0),
          validDays: values.validDays === "" ? null : Number(values.validDays),
          issueLimit: values.issueLimit === "" ? null : Number(values.issueLimit),
        }),
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "저장하지 못했습니다.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <label className="block space-y-2 text-sm">
        <span className="font-medium">쿠폰명</span>
        <input
          required
          maxLength={40}
          value={values.name}
          onChange={(event) => patch({ name: event.target.value })}
          className={fieldClass}
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">할인</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={values.discountType === "FIXED"}
              onChange={() => patch({ discountType: "FIXED" })}
            />
            정액
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={values.discountType === "PERCENT"}
              onChange={() => patch({ discountType: "PERCENT" })}
            />
            정률
          </label>
        </div>
        {values.discountType === "FIXED" ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">할인 금액 (원)</span>
            <input
              required
              inputMode="numeric"
              value={values.discountAmount}
              onChange={(event) => patch({ discountAmount: event.target.value })}
              className={fieldClass}
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">할인율 (%)</span>
              <input
                required
                inputMode="numeric"
                value={values.discountPercent}
                onChange={(event) => patch({ discountPercent: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">최대 할인 (원, 선택)</span>
              <input
                inputMode="numeric"
                value={values.maxDiscountAmount}
                onChange={(event) => patch({ maxDiscountAmount: event.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
        )}
        <label className="block space-y-2 text-sm">
          <span className="font-medium">최소 결제 금액 (원)</span>
          <input
            inputMode="numeric"
            value={values.minOrderAmount}
            onChange={(event) => patch({ minOrderAmount: event.target.value })}
            className={fieldClass}
          />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="col-span-full text-sm font-medium">발급 기간</legend>
        <p className="col-span-full text-xs text-zinc-500">이 기간에만 상품 상세에서 쿠폰을 받을 수 있습니다. 한국 시간입니다.</p>
        <label className="space-y-2 text-sm">
          <span className="font-medium">시작</span>
          <input
            required
            type="datetime-local"
            value={values.issueStartsAt}
            onChange={(event) => patch({ issueStartsAt: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">종료</span>
          <input
            required
            type="datetime-local"
            value={values.issueEndsAt}
            onChange={(event) => patch({ issueEndsAt: event.target.value })}
            className={fieldClass}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">사용 기간</legend>
        <p className="text-xs text-zinc-500">받은 뒤 결제에 쓸 수 있는 기간입니다. 이미 받은 쿠폰의 기한은 바뀌지 않습니다.</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={values.validityKind === "DAYS_FROM_ISSUE"}
              onChange={() => patch({ validityKind: "DAYS_FROM_ISSUE" })}
            />
            받은 날부터 N일
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={values.validityKind === "RANGE"}
              onChange={() => patch({ validityKind: "RANGE" })}
            />
            기간 지정
          </label>
        </div>
        {values.validityKind === "DAYS_FROM_ISSUE" ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">일수</span>
            <input
              required
              inputMode="numeric"
              value={values.validDays}
              onChange={(event) => patch({ validDays: event.target.value })}
              className={fieldClass}
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">시작</span>
              <input
                required
                type="datetime-local"
                value={values.validStartsAt}
                onChange={(event) => patch({ validStartsAt: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">종료</span>
              <input
                required
                type="datetime-local"
                value={values.validEndsAt}
                onChange={(event) => patch({ validEndsAt: event.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">대상 상품</legend>
        <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-zinc-200 p-3">
          {products.length === 0 ? <p className="text-sm text-zinc-500">{productsEmptyLabel}</p> : null}
          {products.map((product) => (
            <label key={product.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.productIds.includes(product.id)}
                onChange={(event) => {
                  patch({
                    productIds: event.target.checked
                      ? [...values.productIds, product.id]
                      : values.productIds.filter((id) => id !== product.id),
                  });
                }}
              />
              <span>{product.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">발급 수량</span>
        <input
          inputMode="numeric"
          placeholder="비우면 제한 없음"
          value={values.issueLimit}
          onChange={(event) => patch({ issueLimit: event.target.value })}
          className={fieldClass}
        />
        {issuedCount > 0 ? <span className="text-xs text-zinc-500">이미 {issuedCount}장이 발급되었습니다. 1인 1회입니다.</span> : null}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(event) => patch({ isActive: event.target.checked })}
        />
        발급 중
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "저장 중…" : couponId ? "수정" : "등록"}
      </button>
    </form>
  );
}
