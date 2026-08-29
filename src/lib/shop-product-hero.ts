import type { CatalogProduct } from "@/lib/shop-products";

export type ProductHeroImage = {
  src: string;
  alt: string;
};

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

/** Course thumbnail + intro markdown images only. No stock filler. */
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

  return collected;
}
