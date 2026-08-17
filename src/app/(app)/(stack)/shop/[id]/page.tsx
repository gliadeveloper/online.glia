import { notFound } from "next/navigation";

import { ProductDetailPanel } from "@/components/shop/product-detail-panel";
import { ShopStackPage } from "@/components/shop/shop-stack-page";
import {
  canUserReviewProduct,
  getProductCourseIds,
  getProductReviews,
  getProductReviewSummary,
  getViewerReviewForCourses,
} from "@/lib/course-reviews";
import { getProductById } from "@/lib/shop-products";
import { getProductShopState, defaultPurchaseShopState } from "@/lib/shop-purchase-state";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

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

  return (
    <ShopStackPage className="shop-pdp-page">
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
