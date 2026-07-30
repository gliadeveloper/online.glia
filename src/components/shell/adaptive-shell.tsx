"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { BackNav } from "@/components/shell/back-nav";
import { MobileGlobalHeader } from "@/components/shell/mobile-global-header";
import { PrimaryNavBottom } from "@/components/shell/primary-nav-bottom";
import { SkipLinks } from "@/components/shell/skip-links";
import { UnifiedHeader } from "@/components/shell/unified-header";
import {
  CHROME_POLICIES,
  getSkipLinkPolicy,
  type NavMode,
} from "@/lib/chrome-policy";

type AdaptiveShellProps = {
  mode: NavMode;
  isLoggedIn: boolean;
  children: React.ReactNode;
};

function isHomeHeroRoute(pathname: string, mode: NavMode) {
  return mode === "tab" && pathname === "/";
}

/**
 * Chrome policy-driven shell.
 *
 * | viewport | tab (root)              | stack (detail/task)        |
 * |----------|-------------------------|----------------------------|
 * | desktop  | unified [logo+nav+auth] | unified [logo+nav+auth] only |
 * | mobile   | [logo+auth] + bottom tab| immersive context bar only   |
 * | mobile home | Home Brand Hero (L0 on-hero + hero content) + bottom tab |
 *
 * Mobile: 100dvh app shell — `#main-content` is the sole scroll container.
 */
export function AdaptiveShell({ mode, isLoggedIn, children }: AdaptiveShellProps) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const policy = CHROME_POLICIES[mode];
  const skip = getSkipLinkPolicy(mode);
  const homeHero = isHomeHeroRoute(pathname, mode);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || !window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    main.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  const mainPadding = homeHero
    ? "px-0 pt-0 pb-[var(--home-stack-sm)] lg:px-4 lg:py-6"
    : "px-4 py-6";

  const showMobileGlobalHeader = policy.mobileGlobalHeader && !homeHero;

  return (
    <div className="app-shell flex min-h-screen flex-col bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]">
      <SkipLinks
        showPrimaryNav={skip.showPrimaryNav}
        showContextNav={skip.showContextNav}
      />

      {policy.desktopUnifiedHeader && (
        <div className="sticky top-0 z-40 hidden lg:block">
          <UnifiedHeader isLoggedIn={isLoggedIn} />
        </div>
      )}

      {showMobileGlobalHeader && (
        <div className="app-shell__chrome z-40 lg:hidden">
          <MobileGlobalHeader isLoggedIn={isLoggedIn} />
        </div>
      )}

      {policy.mobileContextNav && (
        <div className="app-shell__chrome z-40 lg:hidden">
          <BackNav />
        </div>
      )}

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className={`app-shell__main mx-auto w-full max-w-5xl flex-1 ${mainPadding}`}
      >
        {children}
      </main>

      {policy.mobileBottomNav && <PrimaryNavBottom />}
    </div>
  );
}
