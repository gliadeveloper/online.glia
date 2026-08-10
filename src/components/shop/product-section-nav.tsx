"use client";

type ProductSectionNavProps = {
  reviewCount: number;
  hasCurriculum: boolean;
  hasCreator: boolean;
};

const sections = [
  { id: "pdp-intro", label: "소개" },
  { id: "pdp-supplies", label: "준비물" },
  { id: "pdp-curriculum", label: "커리큘럼", conditional: "curriculum" as const },
  { id: "pdp-reviews", label: "리뷰", countKey: "reviews" as const },
  { id: "pdp-creator", label: "크리에이터", conditional: "creator" as const },
];

export function ProductSectionNav({
  reviewCount,
  hasCurriculum,
  hasCreator,
}: ProductSectionNavProps) {
  const visible = sections.filter((section) => {
    if (section.conditional === "curriculum") return hasCurriculum;
    if (section.conditional === "creator") return hasCreator;
    return true;
  });

  return (
    <nav aria-label="상품 상세 섹션" className="shop-pdp-tabs">
      <ul className="shop-pdp-tabs__list">
        {visible.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className="shop-pdp-tabs__link shell-focus-ring">
              {section.label}
              {section.countKey === "reviews" && reviewCount > 0 ? (
                <span className="shop-pdp-tabs__count">{reviewCount}</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
