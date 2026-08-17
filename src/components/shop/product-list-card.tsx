import Link from "next/link";

import {
  ShopKindBadge,
  ShopPrice,
  ShopStatusBadge,
  type ShopStatusTone,
} from "@/components/shop/shop-trust-ui";
import { formatKrw } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

type ProductListCardProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
};

function productSummary(product: CatalogProduct) {
  return product.items
    .map((item) => item.course?.title ?? item.coachingOffering?.title)
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");
}

function listBadge(shopState: ProductShopState): { label: string; tone: ShopStatusTone } | null {
  switch (shopState.kind) {
    case "owned":
      return { label: "수강 중", tone: "complete" };
    case "extend":
      return { label: "연장 가능", tone: "pending" };
    case "restore":
      return { label: "복구 가능", tone: "neutral" };
    case "upgrade":
      return { label: "업그레이드", tone: "info" };
    case "partial":
      return { label: "추가 구매", tone: "info" };
    case "pending":
      return { label: "승인 대기", tone: "pending" };
    default:
      return null;
  }
}

export function ProductListCard({ product, shopState }: ProductListCardProps) {
  const price = getProductPrice(product);
  const summary = productSummary(product);
  const badge = listBadge(shopState);

  return (
    <Link
      href={`/shop/${product.id}`}
      className="shop-trust-product-card corp-trust-focus group"
    >
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <ShopKindBadge kind={product.kind} />

          <div>
            <h3 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
              {product.title}
            </h3>
            {product.description ? (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                {product.description}
              </p>
            ) : null}
            {summary ? (
              <p className="mt-2 text-xs font-medium text-slate-400">{summary}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {shopState.kind === "purchase" ? <ShopPrice amount={formatKrw(price)} /> : null}
            {badge ? <ShopStatusBadge tone={badge.tone}>{badge.label}</ShopStatusBadge> : null}
          </div>
        </div>

        <span className="shop-trust-chevron mt-1" aria-hidden="true">
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      <span className="sr-only">{product.title} 상품 상세로 이동</span>
    </Link>
  );
}
