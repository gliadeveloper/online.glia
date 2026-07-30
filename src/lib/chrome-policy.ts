export type NavMode = "tab" | "stack";

export type ChromePolicy = {
  /** Logo + auth on mobile (tab root only) */
  mobileGlobalHeader: boolean;
  /** [logo + primary nav + auth] unified bar (desktop tab & stack) */
  desktopUnifiedHeader: boolean;
  /** Bottom tab bar (mobile tab only) */
  mobileBottomNav: boolean;
  /** Primary nav inside unified header (desktop) */
  desktopInlineNav: boolean;
  /** Back + title — mobile stack only (replaces all other mobile chrome) */
  mobileContextNav: boolean;
  /** Extra bottom padding for fixed bottom nav */
  mainBottomPadding: boolean;
};

export const CHROME_POLICIES: Record<NavMode, ChromePolicy> = {
  tab: {
    mobileGlobalHeader: true,
    desktopUnifiedHeader: true,
    mobileBottomNav: true,
    desktopInlineNav: true,
    mobileContextNav: false,
    mainBottomPadding: true,
  },
  stack: {
    mobileGlobalHeader: false,
    desktopUnifiedHeader: true,
    mobileBottomNav: false,
    desktopInlineNav: true,
    mobileContextNav: true,
    mainBottomPadding: false,
  },
};

export function getSkipLinkPolicy(mode: NavMode) {
  const policy = CHROME_POLICIES[mode];
  return {
    showPrimaryNav: policy.desktopInlineNav || policy.mobileBottomNav,
    showContextNav: policy.mobileContextNav,
  };
}
