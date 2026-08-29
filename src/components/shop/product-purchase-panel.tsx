"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
          <ProductApplyButton
            productId={product.id}
            isLoggedIn={isLoggedIn}
            className="shop-pdp-sticky-bar__cta"
            disabled={shopState.kind === "pending"}
            pendingOrderId={shopState.kind === "pending" ? shopState.orderId : undefined}
            productTitle={product.title}
            priceLabel={priceLabel}
          />
        </div>
      </div>
    );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}

export function ProductPurchasePanel() {
  return null;
}
