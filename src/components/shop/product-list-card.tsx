import Link from "next/link";

import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";
import { Typography } from "@/components/typography/typography";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
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

function listBadge(shopState: ProductShopState): { label: string; tone: StatusPillTone } | null {
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
      href={`/shop/${product.slug}`}
      className="app-card app-card--interactive shell-focus-ring group flex h-full flex-col p-4"
    >
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Typography as="p" role="caption" weight="medium" color="action">
            {productKindLabels[product.kind]}
          </Typography>
          <Typography as="h3" role="sectionTitle" weight="semibold" color="primary" className="app-section-header__desc">
            {product.title}
          </Typography>
          {product.description && (
            <Typography as="p" role="bodySecondary" color="secondary" className="line-clamp-2 app-section-header__desc">
              {product.description}
            </Typography>
          )}
          {summary && (
            <Typography as="p" role="caption" color="secondary" className="app-section-header__desc">
              {summary}
            </Typography>
          )}

          <div className="app-section-header__desc flex flex-wrap items-center gap-2">
            {shopState.kind === "purchase" && (
              <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
                {formatKrw(price)}
              </Typography>
            )}
            {badge && (
              <StatusPill tone={badge.tone} showCompleteIcon={badge.tone === "complete"}>
                {badge.label}
              </StatusPill>
            )}
          </div>
        </div>

        <span
          aria-hidden="true"
          className="home-feed-row__chevron mt-1 transition group-hover:bg-[var(--color-home-row-chevron-hover-bg)] group-hover:text-[var(--color-home-row-chevron-hover-text)]"
        >
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
