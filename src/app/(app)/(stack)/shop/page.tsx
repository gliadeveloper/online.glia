import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AppEmptyState,
  AppFootnote,
  AppStackPage,
} from "@/components/app";
import { ProductListCard } from "@/components/shop/product-list-card";
import { Typography } from "@/components/typography/typography";
import { getActiveProducts } from "@/lib/shop-products";
import { getCatalogProductShopStates, defaultPurchaseShopState } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/shop");
  }

  const products = await getActiveProducts();
  const shopStates = await getCatalogProductShopStates(user.id, products);

  return (
    <AppStackPage>
      <StackNavTitle title="상품" />

      {products.length === 0 ? (
        <AppEmptyState message="등록된 상품이 없습니다." />
      ) : (
        <ul className="app-grid app-grid--3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductListCard
                product={product}
                shopState={shopStates.get(product.slug) ?? defaultPurchaseShopState}
              />
            </li>
          ))}
        </ul>
      )}

      <AppFootnote>
        구매 내역은{" "}
        <Link href="/orders" className="shell-focus-ring">
          <Typography as="span" role="bodySecondary" weight="medium" color="action">
            주문 내역
          </Typography>
        </Link>
        에서 확인할 수 있습니다.
      </AppFootnote>
    </AppStackPage>
  );
}
