import { BrandMark } from "@/components/shell/brand-mark";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";

type MobileGlobalHeaderProps = {
  isLoggedIn: boolean;
};

export function MobileGlobalHeader({ isLoggedIn }: MobileGlobalHeaderProps) {
  return (
    <header
      data-slot="mobile-global-header"
      data-variant="separated"
      className="mobile-global-header-trust lg:hidden"
    >
      <div className="mobile-global-header-trust__inner">
        <BrandMark />
        <HeaderAuthAction isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
