import { ProductApplyButton } from "@/components/shop/product-apply-button";
import { ShopButtonLink } from "@/components/shop/shop-trust-ui";
import { formatKrw } from "@/lib/customer-labels";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

type ProductDetailSidebarProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
  isLoggedIn: boolean;
  price: number;
  listPrice?: number;
  discountRate?: number;
  averageRating: number;
  reviewCount: number;
  instructorName?: string;
};

function StarSummary({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return null;
  }

  return (
    <p className="shop-pdp-sidebar__rating">
      <span aria-hidden="true">★</span>
      <span>{rating.toFixed(1)}</span>
      <span className="shop-pdp-sidebar__rating-count">({count})</span>
    </p>
  );
}

export function ProductDetailSidebar({
  product,
  shopState,
  isLoggedIn,
  price,
  listPrice,
  discountRate,
  averageRating,
  reviewCount,
  instructorName,
}: ProductDetailSidebarProps) {
  const owned = shopState.kind === "owned";

  return (
    <aside className="shop-pdp-sidebar" aria-label="구매 정보">
      <div className="shop-pdp-sidebar__inner">
        {instructorName ? (
          <p className="shop-pdp-sidebar__creator">{instructorName}</p>
        ) : null}

        <h1 className="shop-pdp-sidebar__title">{product.title}</h1>

        <StarSummary rating={averageRating} count={reviewCount} />

        {!owned ? (
          <div className="shop-pdp-sidebar__price-block">
            {discountRate && listPrice ? (
              <p className="shop-pdp-sidebar__price-original">
                <span className="shop-pdp-sidebar__discount">{discountRate}%</span>
                <span className="shop-pdp-sidebar__list">{formatKrw(listPrice)}</span>
              </p>
            ) : null}
            <p className="shop-pdp-sidebar__price">{formatKrw(price)}</p>
          </div>
        ) : (
          <p className="shop-pdp-sidebar__owned">수강 중 · 바로 학습 가능</p>
        )}

        <div className="shop-pdp-sidebar__actions">
          {owned ? (
            <ShopButtonLink href={shopState.learnHref} className="shop-pdp-apply-btn">
              학습하러 가기
            </ShopButtonLink>
          ) : (
            <ProductApplyButton
              productSlug={product.slug}
              isLoggedIn={isLoggedIn}
              disabled={shopState.kind === "pending"}
              pendingOrderId={shopState.kind === "pending" ? shopState.orderId : undefined}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
