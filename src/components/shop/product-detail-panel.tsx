import { AppButtonLink } from "@/components/app";
import { PurchaseProductButton } from "@/components/shop/purchase-product-button";
import { PurchasePreviewPanel } from "@/components/shop/purchase-preview-panel";
import { Typography } from "@/components/typography/typography";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

type ProductDetailPanelProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
  isLoggedIn: boolean;
};

function formatItemAccess(item: CatalogProduct["items"][number]) {
  if (item.kind === "COACHING_ACCESS") {
    return item.coachingOffering
      ? `코칭 ${item.coachingOffering.totalSessions}회 · ${item.coachingOffering.validDays}일`
      : "코칭";
  }

  if (item.accessDuration === "LIFETIME") {
    return "VOD 강의 · 평생 수강";
  }

  if (item.accessDays) {
    return `VOD 강의 · ${item.accessDays}일 무제한 수강`;
  }

  return "VOD 강의";
}

function feedbackClass(kind: ProductShopState["kind"]) {
  switch (kind) {
    case "owned":
      return "app-feedback app-feedback--success";
    case "extend":
      return "app-feedback app-feedback--pending";
    default:
      return "app-feedback app-feedback--info";
  }
}

function ShopActionPanel({
  product,
  shopState,
  isLoggedIn,
  price,
}: {
  product: CatalogProduct;
  shopState: ProductShopState;
  isLoggedIn: boolean;
  price: number;
}) {
  if (shopState.kind === "owned") {
    return (
      <div className="app-section">
        <div role="status" className={feedbackClass("owned")}>
          <Typography as="p" role="bodySecondary">
            {shopState.message}
          </Typography>
        </div>
        <Typography as="p" role="bodySecondary" color="secondary">
          {shopState.detail}
        </Typography>
        <AppButtonLink href={shopState.learnHref}>학습하러 가기</AppButtonLink>
      </div>
    );
  }

  if (shopState.kind === "purchase") {
    return (
      <div className="app-section">
        <PurchasePreviewPanel preview={shopState.preview} />
        {!isLoggedIn ? (
          <AppButtonLink href={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`}>
            로그인 후 구매하기
          </AppButtonLink>
        ) : (
          <PurchaseProductButton
            productSlug={product.slug}
            priceLabel={formatKrw(price)}
            label={shopState.buttonLabel}
          />
        )}
      </div>
    );
  }

  const loginLabel =
    shopState.kind === "extend"
      ? "로그인 후 연장하기"
      : shopState.kind === "restore"
        ? "로그인 후 복구하기"
        : "로그인 후 구매하기";

  return (
    <div className="app-section">
      <div role="status" className={feedbackClass(shopState.kind)}>
        <Typography as="p" role="bodySecondary">
          {shopState.message}
        </Typography>
      </div>
      <Typography as="p" role="bodySecondary" color="secondary">
        {shopState.detail}
      </Typography>
      <PurchasePreviewPanel preview={shopState.preview} />
      {shopState.learnHref && (shopState.kind === "extend" || shopState.kind === "restore") && (
        <AppButtonLink href={shopState.learnHref} variant="secondary">
          만료된 강의 보기
        </AppButtonLink>
      )}
      {shopState.learnHref && shopState.kind === "partial" && (
        <AppButtonLink href={shopState.learnHref} variant="secondary">
          내 강의 보기
        </AppButtonLink>
      )}
      {isLoggedIn ? (
        <PurchaseProductButton
          productSlug={product.slug}
          priceLabel={formatKrw(price)}
          label={shopState.buttonLabel}
        />
      ) : (
        <AppButtonLink href={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`}>
          {loginLabel}
        </AppButtonLink>
      )}
    </div>
  );
}

export function ProductDetailPanel({ product, shopState, isLoggedIn }: ProductDetailPanelProps) {
  const price = getProductPrice(product);

  return (
    <section className="app-panel app-panel--padded">
      <Typography as="p" role="caption" weight="medium" color="action">
        {productKindLabels[product.kind]}
      </Typography>
      <Typography as="h1" role="pageTitle" weight="semibold" color="primary" className="sr-only lg:not-sr-only app-section-header__desc">
        {product.title}
      </Typography>
      {product.description && (
        <Typography as="p" role="bodySecondary" color="secondary">
          {product.description}
        </Typography>
      )}

      <div className="app-section border-t border-[var(--color-border-subtle)] pt-6">
        <Typography as="h2" role="label" weight="medium" color="secondary">
          포함 항목
        </Typography>
        <ul className="app-section">
          {product.items.map((item) => (
            <li key={item.id} className="app-panel app-panel--padded !p-4 !shadow-none">
              <Typography as="p" role="bodySecondary" weight="medium" color="primary">
                {item.course?.title ?? item.coachingOffering?.title}
              </Typography>
              <Typography as="p" role="caption" color="secondary">
                {formatItemAccess(item)}
              </Typography>
            </li>
          ))}
        </ul>
      </div>

      <div className="app-section border-t border-[var(--color-border-subtle)] pt-6">
        {shopState.kind !== "owned" && (
          <Typography as="p" role="sectionTitle" weight="semibold" color="primary">
            {formatKrw(price)}
          </Typography>
        )}

        <ShopActionPanel
          product={product}
          shopState={shopState}
          isLoggedIn={isLoggedIn}
          price={price}
        />
      </div>
    </section>
  );
}
