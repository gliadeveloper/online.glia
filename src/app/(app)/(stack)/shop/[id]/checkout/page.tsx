import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductCheckoutCoupon } from "@/components/shop/product-checkout-coupon";
import { ProductWidgetCheckout } from "@/components/shop/product-widget-checkout";
import { ShopStackPage } from "@/components/shop/shop-stack-page";
import { formatKrw } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import { listWidgetCheckoutOptions } from "@/lib/payments/toss/options";
import { tossCustomerKey } from "@/lib/payments/toss/verify";
import { getProductById } from "@/lib/shop-products";
import { getProductShopState } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/shop/shop-checkout-glia.css";

type CheckoutPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductCheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/shop/${id}/checkout`)}`);
  }

  const product = await getProductById(id);
  if (!product) notFound();

  const { shopState } = await getProductShopState(user.id, product);
  if (shopState.kind === "owned") {
    redirect(`/shop/${product.id}`);
  }

  const checkout = listWidgetCheckoutOptions();
  const customerKey = tossCustomerKey(user.id);
  const price = getProductPrice(product);

  return (
    <ShopStackPage className="shop-checkout-page">
      <StackNavTitle title="결제" />
      <div className="glia-checkout">
        <div className="glia-checkout__sheet">
          <header>
            <p className="glia-checkout__kicker">Payment</p>
            <h1 className="glia-checkout__title">결제</h1>
          </header>

          <Link href={`/shop/${product.id}`} className="glia-checkout__back">
            상품으로 돌아가기
          </Link>

          <section className="glia-checkout__summary" aria-label="결제 금액">
            <h2 className="glia-checkout__product">{product.title}</h2>
            <p className="glia-checkout__price-row">
              <span>결제 금액</span>
              <strong>{formatKrw(price)}</strong>
            </p>
          </section>

          {shopState.kind === "pending" ? (
            <p className="glia-checkout__notice">
              이미 진행 중인 주문이 있습니다.{" "}
              <Link href={`/orders/${shopState.orderId}`}>주문에서 확인해 주세요.</Link>
            </p>
          ) : checkout.state === "unavailable" ? (
            <p className="glia-checkout__notice">{checkout.message}</p>
          ) : checkout.state === "off" ? (
            <p className="glia-checkout__notice">
              결제를 시작할 수 없습니다. <Link href={`/shop/${product.id}`}>상품 화면</Link>에서 신청해 주세요.
            </p>
          ) : (
            <>
              {customerKey ? (
                <>
                  <ProductCheckoutCoupon />
                  <div className="glia-checkout__pay">
                    <ProductWidgetCheckout
                      productId={product.id}
                      clientKey={checkout.clientKey}
                      variantKey={checkout.variantKey}
                      customerKey={customerKey}
                      amount={price}
                    />
                  </div>
                </>
              ) : (
                <p className="glia-checkout__notice">결제 고객 정보를 만들지 못했습니다.</p>
              )}
            </>
          )}
        </div>
      </div>
    </ShopStackPage>
  );
}
