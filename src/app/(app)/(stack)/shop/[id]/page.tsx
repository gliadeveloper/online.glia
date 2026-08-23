import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { ProductDetailPanel } from "@/components/shop/product-detail-panel";
import { ShopStackPage } from "@/components/shop/shop-stack-page";
import {
  canUserReviewProduct,
  getProductCourseIds,
  getProductReviews,
  getProductReviewSummary,
  getViewerReviewForCourses,
} from "@/lib/course-reviews";
import { getProductPrice } from "@/lib/fulfillment";
import { getProductById } from "@/lib/shop-products";
import { getProductHeroImages } from "@/lib/shop-product-hero";
import { getProductShopState, defaultPurchaseShopState } from "@/lib/shop-purchase-state";
import {
  absoluteUrl,
  buildPageMetadata,
  excerptForOg,
  SITE_NAME,
  toOgImage,
} from "@/lib/site-metadata";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const title = product.title;
  const description = excerptForOg(product.description) ?? `${title} — GLIA 온라인 프로그램`;
  const hero = getProductHeroImages(product)[0];
  const url = `/shop/${product.id}`;

  return buildPageMetadata({
    title,
    description,
    path: url,
    images: [toOgImage(hero?.src, hero?.alt || title)],
  });
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  const courseIds = getProductCourseIds(product.items);
  const guestShopState = {
    ...defaultPurchaseShopState,
    buttonLabel: "신청하기",
    checkoutLabel: "신청하기",
  };

  const [reviewSummary, reviews, viewerReview, canReview, shopStateResult] = await Promise.all([
    getProductReviewSummary(courseIds),
    getProductReviews(courseIds, 8),
    user ? getViewerReviewForCourses(user.id, courseIds) : Promise.resolve(null),
    user ? canUserReviewProduct(user.id, courseIds) : Promise.resolve(false),
    user ? getProductShopState(user.id, product) : Promise.resolve({ shopState: guestShopState }),
  ]);

  const { shopState } = shopStateResult;

  const description = excerptForOg(product.description) ?? `${product.title} — GLIA 온라인 프로그램`;
  const hero = getProductHeroImages(product)[0];
  const ogImage = toOgImage(hero?.src, hero?.alt || product.title);

  return (
    <ShopStackPage className="shop-pdp-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description,
          image: absoluteUrl(ogImage.url),
          brand: { "@type": "Brand", name: SITE_NAME },
          offers: {
            "@type": "Offer",
            priceCurrency: product.currency,
            price: getProductPrice(product),
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/shop/${product.id}`),
          },
        }}
      />
      <StackNavTitle title={product.title} />

      <ProductDetailPanel
        product={product}
        shopState={shopState}
        isLoggedIn={!!user}
        reviewSummary={reviewSummary}
        reviews={reviews}
        canReview={canReview}
        hasExistingReview={!!viewerReview}
      />
    </ShopStackPage>
  );
}
