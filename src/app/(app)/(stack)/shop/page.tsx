import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductListCard } from "@/components/shop/product-list-card";
import { ShopStackPage } from "@/components/shop/shop-stack-page";
import { ShopListHeader } from "@/components/shop/shop-list-header";
import { getActiveProducts } from "@/lib/shop-products";
import { getCatalogProductShopStates, defaultPurchaseShopState } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/shop/shop-list-glia.css";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/shop");
  }

  const products = await getActiveProducts();
  const shopStates = await getCatalogProductShopStates(user.id, products);

  return (
    <ShopStackPage className="shop-list-page">
      <StackNavTitle title="상품" />

      <div className="glia-shop">
        <ShopListHeader productCount={products.length} />

        {products.length === 0 ? (
          <div className="glia-shop__empty">
            <p className="glia-shop__empty-title">아직 열린 프로그램이 없습니다</p>
            <p className="glia-shop__empty-hint">코치가 상품을 등록하면 이곳에서 신청할 수 있어요.</p>
          </div>
        ) : (
          <section aria-labelledby="shop-product-list-heading">
            <h2 id="shop-product-list-heading" className="sr-only">
              판매 중인 상품
            </h2>
            <ul className="glia-shop__list">
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

        <p className="glia-shop__note">
          신청 내역은 <Link href="/orders">주문 내역</Link>에서 확인할 수 있습니다.
        </p>
      </div>
    </ShopStackPage>
  );
}
