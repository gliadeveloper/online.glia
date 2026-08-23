import type { Metadata } from "next";

import { isProxiedR2MediaUrl } from "@/lib/media/proxied-media-url";
import { productDescriptionExcerpt } from "@/lib/shop-product-copy";

export const SITE_NAME = "GLIA";
export const SITE_TITLE = "GLIA — 몸의 신호를 읽고 스스로 조절하는 온라인";
export const SITE_DESCRIPTION =
  "신경 기반 몸 관리를 온라인에서. 강의와 코칭, 매일 체크인으로 몸의 신호를 읽고 스스로 조절하는 방법을 익힙니다.";

const FALLBACK_ORIGIN = "https://online.glia.kr";

function resolveSiteUrl() {
  const raw = process.env.APP_URL?.trim() || FALLBACK_ORIGIN;
  try {
    return new URL(raw);
  } catch {
    return new URL(FALLBACK_ORIGIN);
  }
}

export const SITE_URL = resolveSiteUrl();

export function absoluteUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();
}

export type OgImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const defaultOgImages: OgImage[] = [
  { url: "/og/default.png", ...OG_IMAGE_SIZE, alt: "GLIA" },
];

export const shopOgImages: OgImage[] = [
  { url: "/og/shop.png", ...OG_IMAGE_SIZE, alt: "GLIA 프로그램" },
];

export const communityOgImages: OgImage[] = [
  { url: "/og/community.png", ...OG_IMAGE_SIZE, alt: "GLIA 커뮤니티" },
];

export const event1OgImages: OgImage[] = [
  { url: "/og/event1.png", ...OG_IMAGE_SIZE, alt: "GLIA 온라인 8주 1기 모집" },
];

export const noIndexRobots = { index: false, follow: false } as const;

export const privateSectionMetadata = {
  robots: noIndexRobots,
} satisfies Metadata;

export function excerptForOg(text: string | null | undefined, max = 110) {
  const excerpt = productDescriptionExcerpt(text, max);
  return excerpt || null;
}

export function isPublicOgImageSrc(src: string) {
  if (src.startsWith("/api/media")) return false;
  if (isProxiedR2MediaUrl(src)) return false;
  return src.startsWith("/") || src.startsWith("https://");
}

export function toOgImage(src: string | null | undefined, alt: string): OgImage {
  if (src && isPublicOgImageSrc(src)) {
    return { url: src, ...OG_IMAGE_SIZE, alt };
  }
  return { ...defaultOgImages[0], alt };
}

type ArticleFields = {
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
};

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  images?: OgImage[];
  type?: "website" | "article";
  absoluteTitle?: boolean;
  article?: ArticleFields;
  robots?: Metadata["robots"];
};

export function buildPageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
  absoluteTitle = false,
  article,
  robots,
}: BuildPageMetadataInput): Metadata {
  const ogImages = images?.length ? images : defaultOgImages;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots,
    openGraph: {
      type,
      locale: "ko_KR",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: ogImages,
      ...article,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((image) => image.url),
    },
  };
}

export const rootMetadata = {
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  ...buildPageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
    images: defaultOgImages,
  }),
  title: {
    default: SITE_TITLE,
    template: "%s | GLIA",
  },
} satisfies Metadata;
