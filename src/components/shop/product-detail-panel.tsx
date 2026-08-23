import { ProductDescriptionView } from "@/components/shop/product-description-view";
import { ProductCreatorSection } from "@/components/shop/product-creator-section";
import { ProductCurriculumSection } from "@/components/shop/product-curriculum-section";
import { ProductDetailSidebar } from "@/components/shop/product-detail-sidebar";
import { ProductHeroGallery } from "@/components/shop/product-hero-gallery";
import { ProductReviewSection } from "@/components/shop/product-review-section";
import { ProductSectionNav } from "@/components/shop/product-section-nav";
import { ProductDetailStickyBar } from "@/components/shop/product-purchase-panel";
import { formatKrw } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import { getProductHeroImages } from "@/lib/shop-product-hero";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

import "./shop-pdp-glia.css";

type CatalogCourse = NonNullable<CatalogProduct["items"][number]["course"]>;

type ProductDetailPanelProps = {
  product: CatalogProduct;
  shopState: ProductShopState;
  isLoggedIn: boolean;
  reviewSummary: { averageRating: number; reviewCount: number };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: { name: string | null; email: string };
    course: { title: string };
  }>;
  canReview: boolean;
  hasExistingReview: boolean;
};

function getCourses(product: CatalogProduct): CatalogCourse[] {
  return product.items
    .map((item: CatalogProduct["items"][number]) => item.course)
    .filter((course: CatalogProduct["items"][number]["course"]): course is CatalogCourse => !!course);
}

function getPrimaryInstructor(product: CatalogProduct) {
  const course = getCourses(product)[0];
  return course?.instructor ?? null;
}

export function ProductDetailPanel({
  product,
  shopState,
  isLoggedIn,
  reviewSummary,
  reviews,
  canReview,
  hasExistingReview,
}: ProductDetailPanelProps) {
  const price = getProductPrice(product);
  const hasDiscount = product.salePrice != null && product.salePrice < product.listPrice;
  const discountRate = hasDiscount
    ? Math.round(((product.listPrice - product.salePrice!) / product.listPrice) * 100)
    : undefined;
  const courses = getCourses(product);
  const instructor = getPrimaryInstructor(product);
  const supplies = (product.supplies ?? []).filter((item) => item.trim());
  const instructorName = instructor?.name ?? instructor?.email.split("@")[0] ?? null;
  const heroImages = getProductHeroImages(product);
  const programEyebrow =
    product.kind === "BUNDLE" ? "프로그램" : product.kind === "COACHING_ONLY" ? "코칭" : "VOD";
  const hasCurriculum = courses.some((course: CatalogCourse) => course.modules.length > 0);
  const navItems = [
    { id: "pdp-intro", label: "소개" },
    ...(supplies.length > 0 ? [{ id: "pdp-supplies", label: "준비물" }] : []),
    ...(hasCurriculum ? [{ id: "pdp-curriculum", label: "커리큘럼" }] : []),
    { id: "pdp-reviews", label: "리뷰", count: reviewSummary.reviewCount },
    ...(instructor ? [{ id: "pdp-creator", label: "크리에이터" }] : []),
  ];

  return (
    <article className="glia-pdp">
      <header className="glia-pdp__hero">
        <ProductHeroGallery images={heroImages} />
      </header>

      <div className="glia-pdp__layout">
        <div className="glia-pdp__identity">
          <p className="glia-pdp__eyebrow">{programEyebrow}</p>
          <h1 className="glia-pdp__title">{product.title}</h1>
          <p className="glia-pdp__byline">
            {instructorName ? <strong>{instructorName}</strong> : null}
            {reviewSummary.reviewCount > 0 ? (
              <span>
                ★ {reviewSummary.averageRating.toFixed(1)} · 리뷰 {reviewSummary.reviewCount}
              </span>
            ) : (
              <span>리뷰 없음</span>
            )}
          </p>
        </div>

        <ProductDetailSidebar
          product={product}
          shopState={shopState}
          isLoggedIn={isLoggedIn}
          price={price}
          listPrice={hasDiscount ? product.listPrice : undefined}
          discountRate={discountRate}
          averageRating={reviewSummary.averageRating}
          reviewCount={reviewSummary.reviewCount}
          instructorName={instructorName ?? undefined}
          eyebrow={programEyebrow}
        />

        <div className="glia-pdp__main">
          <ProductSectionNav items={navItems} />

          <div className="glia-pdp__read">
            <section id="pdp-intro" className="glia-pdp__section">
              <h2 className="glia-pdp__section-title">소개</h2>
              {product.description ? (
                <div className="glia-pdp__body">
                  <ProductDescriptionView
                    description={product.description}
                    descriptionMetadata={product.descriptionMetadata}
                  />
                </div>
              ) : (
                <p className="glia-pdp__muted">상품 소개가 준비 중입니다.</p>
              )}
            </section>

            {supplies.length > 0 ? (
              <section id="pdp-supplies" className="glia-pdp__section">
                <h2 className="glia-pdp__section-title">준비물</h2>
                <ul className="glia-pdp__supplies">
                  {supplies.map((item) => (
                    <li key={item} className="glia-pdp__supply">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasCurriculum ? <ProductCurriculumSection courses={courses} /> : null}

            <ProductReviewSection
              productId={product.id}
              averageRating={reviewSummary.averageRating}
              reviewCount={reviewSummary.reviewCount}
              reviews={reviews}
              isLoggedIn={isLoggedIn}
              canReview={canReview}
              hasExistingReview={hasExistingReview}
            />

            {instructor ? <ProductCreatorSection instructor={instructor} /> : null}
          </div>
        </div>
      </div>

      <ProductDetailStickyBar
        product={product}
        shopState={shopState}
        isLoggedIn={isLoggedIn}
        priceLabel={formatKrw(price)}
      />
    </article>
  );
}
