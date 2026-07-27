import Link from "next/link";

import { PurchaseProductButton } from "@/app/(customer)/shop/purchase-product-button";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
import { getProductPrice } from "@/lib/fulfillment";
import { getPurchasedProductSlugs } from "@/lib/shop-customer";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [products, purchasedSlugs] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ kind: "asc" }, { title: "asc" }],
      include: {
        items: {
          include: {
            course: { select: { title: true, slug: true } },
            coachingOffering: {
              select: { title: true, totalSessions: true, validDays: true },
            },
          },
        },
      },
    }),
    getPurchasedProductSlugs(user.id),
  ]);

  const featured = products.find((product) => product.kind === "BUNDLE");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">상품</h1>
        <p className="text-zinc-600">VOD, 코칭, 번들 패키지를 선택해 학습을 시작하세요.</p>
      </header>

      {featured && (
        <section className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-600 to-violet-800 p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-violet-100">추천 번들</p>
          <h2 className="mt-1 text-2xl font-semibold">{featured.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-violet-100">{featured.description}</p>
          <ul className="mt-4 space-y-1 text-sm text-violet-50">
            {featured.items.map((item) => (
              <li key={item.id}>
                {item.kind === "COURSE_ACCESS"
                  ? `VOD · ${item.course?.title}`
                  : `코칭 ${item.coachingOffering?.totalSessions}회 (${item.coachingOffering?.validDays}일)`}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-3xl font-semibold">{formatKrw(getProductPrice(featured))}</p>
            {purchasedSlugs.has(featured.slug) ? (
              <p className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium">구매 완료</p>
            ) : (
              <div className="min-w-[220px]">
                <PurchaseProductButton
                  productSlug={featured.slug}
                  priceLabel={formatKrw(getProductPrice(featured))}
                  label="번들 구매"
                />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const owned = purchasedSlugs.has(product.slug);
          const price = getProductPrice(product);

          return (
            <article
              key={product.id}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                {productKindLabels[product.kind]}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{product.title}</h3>
              <p className="mt-2 flex-1 text-sm text-zinc-600">{product.description}</p>
              <ul className="mt-4 space-y-1 text-xs text-zinc-500">
                {product.items.map((item) => (
                  <li key={item.id}>
                    {item.course?.title ?? item.coachingOffering?.title}
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <p className="text-xl font-semibold">{formatKrw(price)}</p>
                {owned ? (
                  <p className="mt-3 text-sm font-medium text-emerald-700">구매 완료</p>
                ) : (
                  <div className="mt-3">
                    <PurchaseProductButton
                      productSlug={product.slug}
                      priceLabel={formatKrw(price)}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <p className="text-center text-sm text-zinc-500">
        구매 내역은{" "}
        <Link href="/orders" className="font-medium text-violet-600">
          주문 페이지
        </Link>
        에서 확인할 수 있습니다.
      </p>
    </div>
  );
}
