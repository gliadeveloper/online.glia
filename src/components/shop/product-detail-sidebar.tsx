import Link from "next/link";
import { BookOpen, HeartPulse } from "lucide-react";

import { ProductApplyButton } from "@/components/shop/product-apply-button";
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
  eyebrow: string;
};

type BundlePart = {
  key: string;
  kind: "course" | "coaching";
  label: "강의" | "코칭";
  title: string;
  meta: string;
  price: number | null;
};

function getBundleParts(product: CatalogProduct): BundlePart[] {
  return product.items.flatMap((item) => {
    const parts: BundlePart[] = [];

    if (item.course) {
      const weeks = item.course.modules.length;
      const lessons = item.course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
      const meta = [
        weeks > 0 ? `${weeks}주` : null,
        lessons > 0 ? `${lessons}강` : null,
      ].filter(Boolean);

      parts.push({
        key: `course-${item.course.id}`,
        kind: "course",
        label: "강의",
        title: item.course.title,
        meta: meta.join(" · "),
        price: null,
      });
    }

    if (item.coachingOffering) {
      const offering = item.coachingOffering;
      const meta = [
        offering.totalSessions ? `${offering.totalSessions}회` : null,
        offering.validDays ? `${offering.validDays}일` : null,
      ].filter(Boolean);

      parts.push({
        key: `coaching-${offering.id}`,
        kind: "coaching",
        label: "코칭",
        title: offering.title || "1:1 코칭",
        meta: meta.join(" · "),
        price: null,
      });
    }

    return parts;
  });
}

function StarSummary({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <p className="glia-pdp__buy-rating glia-pdp__buy-rating--muted">리뷰 없음</p>;
  }

  return (
    <p className="glia-pdp__buy-rating">
      <span aria-hidden="true">★</span>
      <span>{rating.toFixed(1)}</span>
      <span>리뷰 {count}</span>
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
  eyebrow,
}: ProductDetailSidebarProps) {
  const owned = shopState.kind === "owned";
  const initial = instructorName?.slice(0, 1) ?? eyebrow.slice(0, 1);
  const bundle = getBundleParts(product);

  return (
    <aside className="glia-pdp__buy" aria-label="구매 정보">
      <div className="glia-pdp__buy-inner">
        {instructorName ? (
          <p className="glia-pdp__buy-creator">
            <span className="glia-pdp__buy-avatar" aria-hidden="true">
              {initial}
            </span>
            {instructorName}
          </p>
        ) : (
          <p className="glia-pdp__buy-eyebrow">{eyebrow}</p>
        )}

        <p className="glia-pdp__buy-title" aria-hidden="true">
          {product.title}
        </p>

        <StarSummary rating={averageRating} count={reviewCount} />

        {bundle.length > 0 ? (
          <div className="glia-pdp__bundle">
            <p className="glia-pdp__bundle-label">
              {bundle.length > 1 ? "포함된 상품" : "구성"}
            </p>
            <ul className="glia-pdp__bundle-list">
              {bundle.map((part) => (
                <li key={part.key} className="glia-pdp__bundle-item">
                  <span className={`glia-pdp__bundle-icon glia-pdp__bundle-icon--${part.kind}`} aria-hidden="true">
                    {part.kind === "course" ? (
                      <BookOpen size={18} strokeWidth={2} />
                    ) : (
                      <HeartPulse size={18} strokeWidth={2} />
                    )}
                  </span>
                  <div className="glia-pdp__bundle-copy">
                    <p className="glia-pdp__bundle-kind">{part.label}</p>
                    <p className="glia-pdp__bundle-title">{part.title}</p>
                    {part.meta ? <p className="glia-pdp__bundle-meta">{part.meta}</p> : null}
                  </div>
                  <p className="glia-pdp__bundle-price">
                    {part.price != null ? formatKrw(part.price) : "포함"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!owned ? (
          <div className="glia-pdp__total">
            {bundle.length > 1 ? (
              <p className="glia-pdp__total-note">강의와 코칭을 이 금액으로 함께 결제합니다</p>
            ) : (
              <p className="glia-pdp__total-note">이 구성으로 결제합니다</p>
            )}
            {discountRate && listPrice ? (
              <p className="glia-pdp__buy-original">
                <span className="glia-pdp__price-rate">{discountRate}%</span>
                <span className="glia-pdp__price-list">{formatKrw(listPrice)}</span>
              </p>
            ) : null}
            <div className="glia-pdp__total-row">
              <span>결제 금액</span>
              <strong className="glia-pdp__price-sale">{formatKrw(price)}</strong>
            </div>
          </div>
        ) : (
          <p className="glia-pdp__buy-owned">수강 중 · 바로 학습 가능</p>
        )}

        <div className="glia-pdp__buy-actions">
          {owned ? (
            <Link href={shopState.learnHref} className="shop-pdp-apply-btn">
              학습하기
            </Link>
          ) : (
            <ProductApplyButton
              productId={product.id}
              isLoggedIn={isLoggedIn}
              disabled={shopState.kind === "pending"}
              pendingOrderId={shopState.kind === "pending" ? shopState.orderId : undefined}
              productTitle={product.title}
              priceLabel={formatKrw(price)}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
