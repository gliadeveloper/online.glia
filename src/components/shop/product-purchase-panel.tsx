"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ProductApplyButton } from "@/components/shop/product-apply-button";
import { ProductPayLink } from "@/components/shop/product-pay-link";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";
import type { WidgetCheckoutOptions } from "@/lib/payments/toss/widget";

type ProductDetailStickyBarProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
  isLoggedIn: boolean;
  priceLabel: string;
  checkout: WidgetCheckoutOptions;
  optionLabel?: string;
};

export function ProductDetailStickyBar({
  product,
  shopState,
  isLoggedIn,
  priceLabel,
  checkout,
  optionLabel,
}: ProductDetailStickyBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bar =
    shopState.kind === "owned" ? (
      <div className="shop-pdp-sticky-bar">
        <div className="shop-pdp-sticky-bar__inner">
          <Link href={shopState.learnHref} className="shop-pdp-apply-btn">
            학습하기
          </Link>
        </div>
      </div>
    ) : (
      <div className="shop-pdp-sticky-bar">
        <div className="shop-pdp-sticky-bar__inner">
          {optionLabel ? <p className="shop-pdp-sticky-bar__option">{optionLabel} · {priceLabel}</p> : null}
          {checkout.state === "ready" ? (
            <ProductPayLink productId={product.id} isLoggedIn={isLoggedIn} className="shop-pdp-sticky-bar__cta" />
          ) : checkout.state === "unavailable" ? (
            <p className="shop-pdp-apply-error">{checkout.message}</p>
          ) : (
            <ProductApplyButton
              productId={product.id}
              isLoggedIn={isLoggedIn}
              className="shop-pdp-sticky-bar__cta"
              disabled={shopState.kind === "pending"}
              pendingOrderId={shopState.kind === "pending" ? shopState.orderId : undefined}
              productTitle={product.title}
              priceLabel={priceLabel}
            />
          )}
        </div>
      </div>
    );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}

export function ProductPurchasePanel() {
  return null;
}
