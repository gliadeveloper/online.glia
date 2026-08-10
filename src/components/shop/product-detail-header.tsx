import type { ProductKind } from "@/generated/prisma/client";

import { ShopKindBadge } from "@/components/shop/shop-trust-ui";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
import { getProductHighlights } from "@/components/shop/product-cover-visual";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

type ProductDetailHeaderProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
  priceLabel: string;
  listPriceLabel?: string;
  discountRate?: number;
};

const headerThemes: Record<ProductKind, string> = {
  COURSE_ONLY: "shop-trust-header--course",
  COACHING_ONLY: "shop-trust-header--coaching",
  BUNDLE: "shop-trust-header--bundle",
};

export function ProductDetailHeader({
  product,
  shopState,
  priceLabel,
  listPriceLabel,
  discountRate,
}: ProductDetailHeaderProps) {
  const highlights = getProductHighlights(product);
  const themeClass = headerThemes[product.kind];

  return (
    <header className={`shop-trust-header shop-trust-header--detail ${themeClass}`}>
      <div className="shop-trust-header__blob shop-trust-header__blob--indigo" aria-hidden="true" />
      <div className="shop-trust-header__blob shop-trust-header__blob--violet" aria-hidden="true" />

      <div className="shop-trust-header__inner shop-trust-header__inner--detail">
        <div className="shop-trust-header__copy">
          <ShopKindBadge kind={product.kind} />

          <h1 className="shop-trust-header__title shop-trust-header__title--detail max-lg:sr-only">
            {product.title}
          </h1>

          <p className="shop-trust-header__detail-kind max-lg:sr-only" aria-hidden="true">
            {productKindLabels[product.kind]}
          </p>

          {product.description ? (
            <p className="shop-trust-header__desc shop-trust-header__desc--detail">{product.description}</p>
          ) : null}

          {highlights.length > 0 ? (
            <ul className="shop-trust-header__pills" aria-label="상품 특징">
              {highlights.map((item) => (
                <li key={item} className="shop-trust-header__pill">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {shopState.kind !== "owned" ? (
            <div className="shop-trust-header__price">
              {discountRate && listPriceLabel ? (
                <>
                  <span className="shop-trust-header__price-discount">{discountRate}%</span>
                  <span className="shop-trust-header__price-list">{listPriceLabel}</span>
                </>
              ) : null}
              <p className="shop-trust-header__price-sale">{priceLabel}</p>
            </div>
          ) : (
            <p className="shop-trust-header__price-owned">수강 중 · 바로 학습 가능</p>
          )}
        </div>

        <div className="shop-trust-header__visual shop-trust-header__visual--detail corp-trust-float" aria-hidden="true">
          <div className="shop-trust-header__iso-wrap">
            <div className="shop-trust-header__iso-card shop-trust-header__iso-card--detail">
              <div className="shop-trust-header__iso-icon shop-trust-header__iso-icon--detail">
                <DetailHeaderIcon kind={product.kind} />
              </div>
              <p className="shop-trust-header__iso-label">{productKindLabels[product.kind]}</p>
              <p className="shop-trust-header__iso-sub">{product.items.length}개 구성</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function DetailHeaderIcon({ kind }: { kind: ProductKind }) {
  if (kind === "COACHING_ONLY") {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    );
  }

  if (kind === "BUNDLE") {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    );
  }

  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
