"use client";

import Link from "next/link";

import { ProductApplyButton } from "@/components/shop/product-apply-button";
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
      <div className="shop-pdp-sticky-bar">
        <div className="shop-pdp-sticky-bar__inner">
          <div className="shop-pdp-sticky-bar__copy">
            <p className="shop-pdp-sticky-bar__title">{product.title}</p>
            <p className="shop-pdp-sticky-bar__owned">수강 중</p>
          </div>
          <Link href={shopState.learnHref} className="shop-pdp-apply-btn shop-pdp-apply-btn--compact shop-pdp-sticky-bar__cta">
            학습하기
          </Link>
        </div>
      </div>
    );
  }

  const pending = shopState.kind === "pending";

  return (
    <div className="shop-pdp-sticky-bar">
      <div className="shop-pdp-sticky-bar__inner">
        <div className="shop-pdp-sticky-bar__copy">
          <p className="shop-pdp-sticky-bar__title">{product.title}</p>
          <p className={pending ? "shop-pdp-sticky-bar__pending" : "shop-pdp-sticky-bar__price"}>
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
          productTitle={product.title}
          priceLabel={priceLabel}
        />
      </div>
    </div>
  );
}

export function ProductPurchasePanel() {
  return null;
}
