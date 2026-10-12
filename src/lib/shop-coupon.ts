const COUPON_CODE = /^[A-Za-z0-9_-]{2,40}$/;

export type ShopCouponPreview =
  | { ok: true; code: string; discountAmount: number }
  | { ok: false; message: string };

/** Coupon codes are entered on the checkout screen. No coupon catalog is issued yet. */
export function previewShopCoupon(rawCode: string): ShopCouponPreview {
  const code = rawCode.trim();
  if (!code) return { ok: false, message: "쿠폰 코드를 입력해 주세요." };
  if (!COUPON_CODE.test(code)) return { ok: false, message: "쿠폰 코드를 확인해 주세요." };
  return { ok: false, message: "등록된 쿠폰이 없습니다." };
}
