import Link from "next/link";

import { ChevronIcon } from "@/components/home/home-icons";
import type { HomeProductCard } from "@/lib/home";

type HomeDiscoverProps = {
  products: HomeProductCard[];
  priority: "start" | "recommend";
};

export function HomeDiscover({ products, priority }: HomeDiscoverProps) {
  if (products.length === 0) {
    return null;
  }

  const title = priority === "start" ? "처음 시작해 볼까요?" : "이런 여정도 있어요";
  const caption =
    priority === "start" ? "회복과 정렬을 위한 첫 프로그램을 골라 보세요" : "지금 흐름을 더 깊게 이어 갈 수 있는 상품";

  return (
    <section className="glia-section" aria-labelledby="home-discover-heading">
      <header className="glia-section__header">
        <div>
          <h2 id="home-discover-heading" className="glia-section__title">
            {title}
          </h2>
          <p className="glia-section__caption">{caption}</p>
        </div>
        <Link href="/shop" className="glia-section__more">
          전체 보기
        </Link>
      </header>

      <ul className="glia-discover">
        {products.map((product) => (
          <li key={product.id}>
            <Link href={product.href} className="glia-product">
              <span className="glia-product__media" aria-hidden="true">
                {product.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.thumbnailUrl} alt="" />
                ) : (
                  <span className="glia-product__fallback" />
                )}
              </span>
              <span className="glia-product__body">
                <span className="glia-product__kind">{product.kindLabel}</span>
                <span className="glia-product__title">{product.title}</span>
                <span className="glia-product__price">
                  <strong>{product.priceLabel}</strong>
                  {product.listPriceLabel && <s>{product.listPriceLabel}</s>}
                </span>
              </span>
              <ChevronIcon className="glia-product__chevron" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
