import {
  HomeFeedPanel,
  HomeFeedPanelHeader,
  HomeFeedPanelList,
  HomeFeedRow,
  HomeFeedRowMedia,
} from "@/components/home/home-feed-panel";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import { getActiveProducts } from "@/lib/shop-products";
import {
  defaultPurchaseShopState,
  getCatalogProductShopStates,
  type ProductShopState,
} from "@/lib/shop-purchase-state";

type FeaturedProductsSectionProps = {
  userId?: string;
  limit?: number;
};

function productSubtitle(product: Awaited<ReturnType<typeof getActiveProducts>>[number], shopState: ProductShopState) {
  const kindLabel = productKindLabels[product.kind];

  if (shopState.kind === "owned") {
    return `${kindLabel} · 수강 중`;
  }

  const price = getProductPrice(product);
  return `${kindLabel} · ${formatKrw(price)}`;
}

export async function FeaturedProductsSection({ userId, limit = 3 }: FeaturedProductsSectionProps) {
  const products = await getActiveProducts(limit);

  if (products.length === 0) {
    return null;
  }

  const shopStates = userId
    ? await getCatalogProductShopStates(userId, products)
    : new Map<string, ProductShopState>();

  const headingId = "featured-products-heading";

  return (
    <HomeFeedPanel aria-labelledby={headingId}>
      <HomeFeedPanelHeader title="추천 상품" titleId={headingId} moreHref="/shop" />
      <HomeFeedPanelList>
        {products.map((product) => {
          const shopState = shopStates.get(product.slug) ?? defaultPurchaseShopState;

          return (
            <HomeFeedRow
              key={product.id}
              href={`/shop/${product.slug}`}
              title={product.title}
              subtitle={productSubtitle(product, shopState)}
              leading={
                <HomeFeedRowMedia label={productKindLabels[product.kind]} accent />
              }
            />
          );
        })}
      </HomeFeedPanelList>
    </HomeFeedPanel>
  );
}
