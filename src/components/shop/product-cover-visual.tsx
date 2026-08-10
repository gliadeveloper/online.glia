import type { ProductKind } from "@/generated/prisma/client";
import { productKindLabels } from "@/lib/customer-labels";
import type { CatalogProduct } from "@/lib/shop-products";

type ProductCoverVisualProps = {
  product: CatalogProduct;
};

const coverThemes: Record<
  ProductKind,
  { gradient: string; accent: string; label: string }
> = {
  COURSE_ONLY: {
    gradient: "from-indigo-600 via-indigo-500 to-violet-600",
    accent: "bg-indigo-400/30",
    label: "VOD 강의",
  },
  COACHING_ONLY: {
    gradient: "from-violet-600 via-purple-500 to-indigo-600",
    accent: "bg-violet-400/30",
    label: "1:1 코칭",
  },
  BUNDLE: {
    gradient: "from-indigo-700 via-violet-600 to-purple-600",
    accent: "bg-indigo-300/35",
    label: "올인원 번들",
  },
};

function CoverIcon({ kind }: { kind: ProductKind }) {
  if (kind === "COACHING_ONLY") {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "BUNDLE") {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
      </svg>
    );
  }

  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M12 6v8M8 10h8" strokeLinecap="round" />
    </svg>
  );
}

export function ProductCoverVisual({ product }: ProductCoverVisualProps) {
  const theme = coverThemes[product.kind];
  const itemCount = product.items.length;

  return (
    <div className={`shop-pdp-cover bg-gradient-to-br ${theme.gradient}`}>
      <div className={`shop-pdp-cover__blob ${theme.accent}`} aria-hidden="true" />
      <div className="shop-pdp-cover__blob shop-pdp-cover__blob--secondary" aria-hidden="true" />

      <div className="shop-pdp-cover__content">
        <span className="shop-pdp-cover__tag">{productKindLabels[product.kind]}</span>

        <div className="shop-pdp-cover__visual corp-trust-float">
          <div className="shop-pdp-cover__iso-card">
            <div className="shop-pdp-cover__iso-icon text-white/90">
              <CoverIcon kind={product.kind} />
            </div>
            <p className="mt-4 text-sm font-semibold text-white/95">{theme.label}</p>
            {itemCount > 1 ? (
              <p className="mt-1 text-xs text-white/70">{itemCount}개 구성</p>
            ) : null}
          </div>
        </div>

        <p className="shop-pdp-cover__title line-clamp-2">{product.title}</p>
      </div>
    </div>
  );
}

export function getProductHighlights(product: CatalogProduct): string[] {
  const highlights: string[] = [];

  if (product.kind === "BUNDLE") {
    highlights.push(`${product.items.length}개 구성품`);
  }

  for (const item of product.items) {
    if (item.kind === "COACHING_ACCESS" && item.coachingOffering) {
      highlights.push(`코칭 ${item.coachingOffering.totalSessions}회`);
      highlights.push(`${item.coachingOffering.validDays}일 이용`);
    }

    if (item.kind === "COURSE_ACCESS") {
      if (item.accessDuration === "LIFETIME") {
        highlights.push("평생 수강");
      } else if (item.accessDays) {
        highlights.push(`${item.accessDays}일 무제한`);
      }
    }
  }

  return [...new Set(highlights)].slice(0, 4);
}

export function getProductAudienceCopy(kind: ProductKind): { title: string; bullets: string[] } {
  switch (kind) {
    case "COACHING_ONLY":
      return {
        title: "이런 분께 추천해요",
        bullets: [
          "1:1 맞춤 피드백이 필요한 분",
          "목표 달성을 위해 코치와 함께하고 싶은 분",
          "체계적인 세션으로 성장 속도를 높이고 싶은 분",
        ],
      };
    case "BUNDLE":
      return {
        title: "이런 분께 추천해요",
        bullets: [
          "강의와 코칭을 한 번에 시작하고 싶은 분",
          "학습 + 실행을 함께 가져가고 싶은 분",
          "가장 합리적인 올인원 패키지를 찾는 분",
        ],
      };
    default:
      return {
        title: "이런 분께 추천해요",
        bullets: [
          "내 속도에 맞춰 반복 학습하고 싶은 분",
          "이론부터 실전까지 VOD로 탄탄히 쌓고 싶은 분",
          "언제 어디서나 수강할 수 있는 유연함이 필요한 분",
        ],
      };
  }
}
