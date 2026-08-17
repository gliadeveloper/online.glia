import { ProductCoverVisual, getProductAudienceCopy } from "@/components/shop/product-cover-visual";
import { ProductCreatorSection } from "@/components/shop/product-creator-section";
import { ProductCurriculumSection } from "@/components/shop/product-curriculum-section";
import { ProductDetailSidebar } from "@/components/shop/product-detail-sidebar";
import { ProductReviewSection } from "@/components/shop/product-review-section";
import { ProductSectionNav } from "@/components/shop/product-section-nav";
import { ProductDetailStickyBar } from "@/components/shop/product-purchase-panel";
import { formatKrw } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import type { CatalogProduct } from "@/lib/shop-products";
import type { ProductShopState } from "@/lib/shop-purchase-state";

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

function formatSupplies(product: CatalogProduct) {
  const supplies: string[] = [];

  for (const item of product.items) {
    if (item.kind === "COACHING_ACCESS" && item.coachingOffering) {
      supplies.push(`코칭 ${item.coachingOffering.totalSessions}회 세션`);
      supplies.push(`${item.coachingOffering.validDays}일 이용 기간`);
    }

    if (item.kind === "COURSE_ACCESS") {
      if (item.accessDuration === "LIFETIME") {
        supplies.push("VOD 강의 · 평생 수강");
      } else if (item.accessDays) {
        supplies.push(`VOD 강의 · ${item.accessDays}일 무제한 수강`);
      } else {
        supplies.push("VOD 강의 수강권");
      }
    }
  }

  return supplies;
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
  const audience = getProductAudienceCopy(product.kind);
  const supplies = formatSupplies(product);

  return (
    <>
      <div className="shop-pdp-v2">
        <div className="shop-pdp-v2__hero">
          <ProductCoverVisual product={product} />
        </div>

        <div className="shop-pdp-v2__layout">
          <div className="shop-pdp-v2__main">
            <ProductSectionNav
              reviewCount={reviewSummary.reviewCount}
              hasCurriculum={courses.some((course: CatalogCourse) => course.modules.length > 0)}
              hasCreator={!!instructor}
            />

            <section id="pdp-intro" className="shop-pdp-block">
              <h2 className="shop-pdp-block__title">소개</h2>
              {product.description ? (
                <p className="shop-pdp-prose">{product.description}</p>
              ) : (
                <p className="shop-pdp-prose shop-pdp-prose--muted">상품 소개가 준비 중입니다.</p>
              )}

              <div className="shop-pdp-audience">
                <h3 className="shop-pdp-audience__title">{audience.title}</h3>
                <ul className="shop-pdp-audience-list">
                  {audience.bullets.map((bullet) => (
                    <li key={bullet} className="shop-pdp-audience-item">
                      <span className="shop-pdp-audience-item__dot" aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="pdp-supplies" className="shop-pdp-block">
              <h2 className="shop-pdp-block__title">준비물</h2>
              <ul className="shop-pdp-supplies">
                {supplies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li>안정적인 인터넷 환경</li>
                <li>학습 기록을 위한 노트 또는 메모 앱</li>
              </ul>
            </section>

            {courses.some((course) => course.modules.length > 0) ? (
              <ProductCurriculumSection courses={courses} />
            ) : null}

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

          <ProductDetailSidebar
            product={product}
            shopState={shopState}
            isLoggedIn={isLoggedIn}
            price={price}
            listPrice={hasDiscount ? product.listPrice : undefined}
            discountRate={discountRate}
            averageRating={reviewSummary.averageRating}
            reviewCount={reviewSummary.reviewCount}
            instructorName={instructor?.name ?? instructor?.email.split("@")[0]}
          />
        </div>
      </div>

      <ProductDetailStickyBar
        product={product}
        shopState={shopState}
        isLoggedIn={isLoggedIn}
        priceLabel={formatKrw(price)}
      />
    </>
  );
}
