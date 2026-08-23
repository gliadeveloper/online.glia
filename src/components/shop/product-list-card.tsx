import Link from "next/link";

import { getProductHighlights } from "@/components/shop/product-cover-visual";
import { formatKrw } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import { productDescriptionExcerpt } from "@/lib/shop-product-copy";
import { getProductHeroImages } from "@/lib/shop-product-hero";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

type ProductListCardProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
};

function programKindLabel(kind: CatalogProduct["kind"]) {
  if (kind === "BUNDLE") return "프로그램";
  if (kind === "COACHING_ONLY") return "코칭";
  return "VOD";
}

function listStatus(shopState: ProductShopState): { label: string; tone: "complete" | "pending" | "info" } | null {
  switch (shopState.kind) {
    case "owned":
      return { label: "수강 중", tone: "complete" };
    case "extend":
      return { label: "연장 가능", tone: "pending" };
    case "restore":
      return { label: "복구 가능", tone: "info" };
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

function instructorName(product: CatalogProduct) {
  const instructor = product.items.find((item) => item.course?.instructor)?.course?.instructor;
  return instructor?.name ?? instructor?.email.split("@")[0] ?? null;
}

export function ProductListCard({ product, shopState }: ProductListCardProps) {
  const price = getProductPrice(product);
  const cover = getProductHeroImages(product)[0];
  const excerpt = productDescriptionExcerpt(product.description, 150);
  const highlights = getProductHighlights(product).slice(0, 3);
  const status = listStatus(shopState);
  const creator = instructorName(product);
  const priceLabel =
    shopState.kind === "owned" ? "수강 중" : shopState.kind === "pending" ? "승인 대기" : formatKrw(price);

  return (
    <Link href={`/shop/${product.id}`} className="glia-shop-item">
      <div className="glia-shop-item__visual">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.src} alt="" />
        ) : null}
      </div>

      <div className="glia-shop-item__copy">
        <div className="glia-shop-item__meta">
          <p className="glia-shop-item__kind">{programKindLabel(product.kind)}</p>
          {status ? (
            <span className={`glia-shop-item__status glia-shop-item__status--${status.tone}`}>{status.label}</span>
          ) : null}
        </div>

        <h2 className="glia-shop-item__title">{product.title}</h2>
        {creator ? <p className="glia-shop-item__byline">{creator}</p> : null}
        {excerpt ? <p className="glia-shop-item__desc">{excerpt}</p> : null}

        {highlights.length > 0 ? (
          <p className="glia-shop-item__includes">{highlights.join(" · ")}</p>
        ) : null}

        <div className="glia-shop-item__foot">
          <p className="glia-shop-item__price">{priceLabel}</p>
          <span className="glia-shop-item__cta">자세히 보기</span>
        </div>
      </div>
    </Link>
  );
}
