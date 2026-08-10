import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="brand-mark-trust shell-focus-ring" aria-label="홈으로 이동">
      <span className="brand-mark-trust__logo" aria-hidden="true">
        G
      </span>
      <span className="brand-mark-trust__wordmark" aria-hidden="true">
        온라인 <span className="brand-mark-trust__accent">학습</span>
      </span>
      <span className="sr-only">온라인 학습 홈</span>
    </Link>
  );
}
