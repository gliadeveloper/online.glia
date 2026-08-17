"use client";

import { ProductApplyButton } from "@/components/shop/product-apply-button";
import { ShopButtonLink } from "@/components/shop/shop-trust-ui";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

type ProductDetailStickyBarProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
  isLoggedIn: boolean;
  priceLabel: string;
};

export function ProductDetailStickyBar({
  product,
  shopState,
  isLoggedIn,
  priceLabel,
}: ProductDetailStickyBarProps) {
  if (shopState.kind === "owned") {
    return (
      <div className="shop-pdp-sticky-bar lg:hidden">
        <div className="shop-pdp-sticky-bar__inner">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{product.title}</p>
            <p className="text-xs text-emerald-600">수강 중</p>
          </div>
          <ShopButtonLink href={shopState.learnHref} className="shop-pdp-sticky-bar__cta">
            학습하기
          </ShopButtonLink>
        </div>
      </div>
    );
  }

  const pending = shopState.kind === "pending";

  return (
    <div className="shop-pdp-sticky-bar lg:hidden">
      <div className="shop-pdp-sticky-bar__inner">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{product.title}</p>
          <p className={`text-base font-bold ${pending ? "text-amber-600" : "text-slate-900"}`}>
            {pending ? "승인 대기 중" : priceLabel}
          </p>
        </div>
        <ProductApplyButton
          productId={product.id}
          isLoggedIn={isLoggedIn}
          compact
          className="shop-pdp-sticky-bar__cta"
          disabled={pending}
          pendingOrderId={pending ? shopState.orderId : undefined}
        />
      </div>
    </div>
  );
}

// Legacy export kept for any imports — purchase panel replaced by sidebar apply flow.
export function ProductPurchasePanel() {
  return null;
}
