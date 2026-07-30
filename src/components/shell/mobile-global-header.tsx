import Link from "next/link";

import { BrandMark } from "@/components/shell/brand-mark";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";
import { Typography } from "@/components/typography/typography";

export type MobileGlobalHeaderVariant = "separated" | "on-hero";

type MobileGlobalHeaderProps = {
  isLoggedIn: boolean;
  /** separated = default tab chrome; on-hero = L0 integrated on Home Brand Hero surface */
  variant?: MobileGlobalHeaderVariant;
};

function HeroUtilityButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="home-hero__utility shell-focus-ring flex size-10 items-center justify-center rounded-full text-[var(--color-hero-text)] transition"
    >
      {children}
    </Link>
  );
}

function MobileGlobalHeaderOnHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header
      data-slot="mobile-global-header"
      data-variant="on-hero"
      className="home-hero__global lg:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="home-hero__wordmark shell-focus-ring">
          <Typography as="span" role="contextTitle" weight="semibold">
            온라인 학습
          </Typography>
        </Link>
        <div className="flex items-center gap-0.5">
          <HeroUtilityButton href="/community" label="커뮤니티 검색">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <circle cx={11} cy={11} r={7} />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </HeroUtilityButton>
          <HeroUtilityButton
            href={isLoggedIn ? "/mypage" : "/login"}
            label={isLoggedIn ? "마이페이지" : "로그인"}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <circle cx={12} cy={8} r={3.5} />
              <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
            </svg>
          </HeroUtilityButton>
        </div>
      </div>
    </header>
  );
}

function MobileGlobalHeaderSeparated({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header
      data-slot="mobile-global-header"
      data-variant="separated"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/95 backdrop-blur-sm lg:hidden"
    >
      <div className="mx-auto flex h-[var(--header-height)] max-w-5xl items-center justify-between gap-4 px-4">
        <BrandMark />
        <HeaderAuthAction isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}

/** Mobile tab root L0 — separated chrome or integrated on Home Brand Hero. */
export function MobileGlobalHeader({
  isLoggedIn,
  variant = "separated",
}: MobileGlobalHeaderProps) {
  if (variant === "on-hero") {
    return <MobileGlobalHeaderOnHero isLoggedIn={isLoggedIn} />;
  }

  return <MobileGlobalHeaderSeparated isLoggedIn={isLoggedIn} />;
}
