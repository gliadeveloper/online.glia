import { formatKrw } from "@/lib/customer-labels";

export const MIN_PAYABLE_KRW = 100;

/** Letters and digits only, uppercased. Spaces and hyphens are ignored. */
export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type CouponDiscountRule = {
  discountType: "FIXED" | "PERCENT";
  discountAmount: number | null;
  discountPercent: number | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
};

/** Won discounted from a catalog price. Zero when the coupon does not apply. */
export function couponDiscountWon(rule: CouponDiscountRule, price: number) {
  if (!Number.isSafeInteger(price) || price < 0) return 0;
  if (!Number.isSafeInteger(rule.minOrderAmount) || price < rule.minOrderAmount) return 0;

  let discount = 0;
  if (rule.discountType === "FIXED") {
    discount = rule.discountAmount ?? 0;
  } else {
    const percent = rule.discountPercent ?? 0;
    if (!Number.isSafeInteger(percent) || percent < 1 || percent > 100) return 0;
    discount = Math.floor((price * percent) / 100);
    if (rule.maxDiscountAmount != null) {
      if (!Number.isSafeInteger(rule.maxDiscountAmount) || rule.maxDiscountAmount < 1) return 0;
      discount = Math.min(discount, rule.maxDiscountAmount);
    }
  }

  if (!Number.isSafeInteger(discount) || discount < 1) return 0;
  discount = Math.min(discount, price);
  if (price - discount < MIN_PAYABLE_KRW) return 0;
  return discount;
}

export function formatCouponBenefit(rule: CouponDiscountRule) {
  if (rule.discountType === "FIXED") return formatKrw(rule.discountAmount ?? 0);
  const cap =
    rule.maxDiscountAmount != null ? ` · 최대 ${formatKrw(rule.maxDiscountAmount)}` : "";
  return `${rule.discountPercent ?? 0}%${cap}`;
}

export function formatCouponCondition(minOrderAmount: number) {
  if (minOrderAmount < 1) return "금액 제한 없음";
  return `${formatKrw(minOrderAmount)} 이상 결제`;
}
