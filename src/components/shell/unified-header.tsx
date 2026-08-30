import type { UserRole } from "@/generated/prisma/client";

import { BrandMark } from "@/components/shell/brand-mark";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";
import { PrimaryNavInline } from "@/components/shell/primary-nav-inline";

type UnifiedHeaderProps = {
  isLoggedIn: boolean;
  userRole?: UserRole | null;
};

/** Desktop: [logo + primary nav + auth] in a single header bar. */
export function UnifiedHeader({ isLoggedIn, userRole }: UnifiedHeaderProps) {
  return (
    <header
      data-slot="unified-header"
      className="unified-header-trust"
    >
      <div className="unified-header-trust__inner">
        <BrandMark />
        <PrimaryNavInline className="min-w-0 flex-1" />
        <HeaderAuthAction isLoggedIn={isLoggedIn} userRole={userRole} />
      </div>
    </header>
  );
}
