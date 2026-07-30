import { notFound, redirect } from "next/navigation";

import { AppStackBackLink, AppStackPage } from "@/components/app";
import { ProductDetailPanel } from "@/components/shop/product-detail-panel";
import { getProductBySlug } from "@/lib/shop-products";
import { getProductShopState } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const user = await getCurrentUser();
  const { slug } = await params;

  if (!user) {
    redirect(`/login?next=/shop/${slug}`);
  }

  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const { shopState } = await getProductShopState(user.id, product);

  return (
    <AppStackPage>
      <StackNavTitle title={product.title} />

      <AppStackBackLink href="/shop">← 상품 목록</AppStackBackLink>

      <ProductDetailPanel product={product} shopState={shopState} isLoggedIn={!!user} />
    </AppStackPage>
  );
}
