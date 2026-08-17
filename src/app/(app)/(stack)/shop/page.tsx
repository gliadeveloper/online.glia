import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFootnote } from "@/components/app";
import { ProductListCard } from "@/components/shop/product-list-card";
import { ShopStackPage } from "@/components/shop/shop-stack-page";
import { ShopListHeader } from "@/components/shop/shop-list-header";
import { ShopEmptyState } from "@/components/shop/shop-trust-ui";
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
    <ShopStackPage>
      <StackNavTitle title="상품" />

      <ShopListHeader
        pageTitle="상품"
        title="나에게 맞는"
        titleAccent="클래스 찾기"
        description="VOD 강의, 코칭, 번들 상품을 둘러보고 지금 바로 성장을 시작해 보세요."
      />

      {products.length === 0 ? (
        <ShopEmptyState message="등록된 상품이 없습니다." />
      ) : (
        <section aria-labelledby="shop-product-grid-heading">
          <h2 id="shop-product-grid-heading" className="sr-only">
            판매 중인 상품
          </h2>
          <ul className="shop-trust-grid">
            {products.map((product) => (
              <li key={product.id}>
                <ProductListCard
                  product={product}
                  shopState={shopStates.get(product.id) ?? defaultPurchaseShopState}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <AppFootnote>
        구매 내역은{" "}
        <Link href="/orders" className="corp-trust-link corp-trust-focus rounded-sm">
          주문 내역
        </Link>
        에서 확인할 수 있습니다.
      </AppFootnote>
    </ShopStackPage>
  );
}
