import type { CatalogProduct } from "@/lib/shop-products";

export type ProductHeroImage = {
  src: string;
  alt: string;
};

const FALLBACK_HERO_IMAGES: ProductHeroImage[] = [
  { src: "/shop/hero/alignment.jpg", alt: "정렬과 자세를 알아차리는 순간" },
  { src: "/shop/hero/breath.jpg", alt: "호흡과 몸의 신호를 관찰하는 순간" },
  { src: "/shop/hero/movement.jpg", alt: "천천히 걷는 회복의 움직임" },
  { src: "/shop/hero/recovery.jpg", alt: "신경계가 쉬는 회복의 자리" },
];

function extractMarkdownImages(description: string | null | undefined) {
  if (!description) return [];

  return [...description.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map((match) => ({
      src: match[2],
      alt: match[1].trim() || "상품 이미지",
    }))
    .filter((image) => {
      const src = image.src;
      if (src.includes("]")) return false;
      if (src.startsWith("/shop/intro/")) return false;
      return src.startsWith("/") || src.startsWith("http");
    });
}

export function getProductHeroImages(product: CatalogProduct): ProductHeroImage[] {
  const fromCourses = product.items
    .map((item) => item.course?.thumbnailUrl?.trim())
    .filter((src): src is string => Boolean(src))
    .map((src) => ({ src, alt: product.title }));

  const collected: ProductHeroImage[] = [];
  const seen = new Set<string>();

  for (const image of [...fromCourses, ...extractMarkdownImages(product.description)]) {
    if (seen.has(image.src)) continue;
    seen.add(image.src);
    collected.push(image);
    if (collected.length >= 4) return collected;
  }

  for (const fallback of FALLBACK_HERO_IMAGES) {
    if (collected.length >= 4) break;
    if (seen.has(fallback.src)) continue;
    collected.push(fallback);
  }

  return collected;
}
