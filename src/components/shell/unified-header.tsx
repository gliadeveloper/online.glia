import { BrandMark } from "@/components/shell/brand-mark";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";
import { PrimaryNavInline } from "@/components/shell/primary-nav-inline";

type UnifiedHeaderProps = {
  isLoggedIn: boolean;
};

/** Desktop: [logo + primary nav + auth] in a single header bar. */
export function UnifiedHeader({ isLoggedIn }: UnifiedHeaderProps) {
  return (
    <header
      data-slot="unified-header"
      className="unified-header-trust"
    >
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-5xl items-center gap-4 px-4 lg:px-6">
        <BrandMark />
        <PrimaryNavInline className="min-w-0 flex-1" />
        <HeaderAuthAction isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
