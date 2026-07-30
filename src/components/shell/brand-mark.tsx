import Link from "next/link";

export function BrandMark() {
  return (
    <Link
      href="/"
      className="shell-focus-ring flex min-h-11 min-w-11 shrink-0 items-center gap-3 rounded-[var(--radius-md)] py-1 pr-2"
      aria-label="홈으로 이동"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]"
        role="img"
        aria-label="서비스 로고"
      >
        <span className="sr-only">로고 영역</span>
      </div>

      <div className="hidden min-w-0 sm:block">
        <span className="sr-only">서비스 슬로건</span>
        <span
          aria-hidden="true"
          className="block h-3 w-28 max-w-full rounded-sm bg-[var(--color-surface-muted)] ring-1 ring-[var(--color-border)] ring-inset"
        />
      </div>
    </Link>
  );
}
