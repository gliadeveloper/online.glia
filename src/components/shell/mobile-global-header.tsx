import type { UserRole } from "@/generated/prisma/client";

import { BrandMark } from "@/components/shell/brand-mark";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";

type MobileGlobalHeaderProps = {
  isLoggedIn: boolean;
  userRole?: UserRole | null;
};

export function MobileGlobalHeader({ isLoggedIn, userRole }: MobileGlobalHeaderProps) {
  return (
    <header
      data-slot="mobile-global-header"
      data-variant="separated"
      className="mobile-global-header-trust lg:hidden"
    >
      <div className="mobile-global-header-trust__inner">
        <BrandMark />
        <HeaderAuthAction isLoggedIn={isLoggedIn} userRole={userRole} />
      </div>
    </header>
  );
}
