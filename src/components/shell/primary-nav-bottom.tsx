"use client";

import { usePathname } from "next/navigation";

import { isNavActive, primaryNavItems } from "@/components/shell/nav-items";
import { NavTabItem } from "@/components/shell/nav-tab-item";

export function PrimaryNavBottom() {
  const pathname = usePathname();

  return (
    <nav
      id="primary-nav"
      aria-label="주요 메뉴"
      data-slot="primary-nav-bottom"
      className="nav-tab-bar app-shell__chrome z-50 shrink-0 lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {primaryNavItems.map((item) => {
          const { href, label, Icon } = item;
          const exact = "exact" in item ? item.exact : undefined;
          const active = isNavActive(pathname, href, exact);

          return (
            <li key={href} className="flex min-w-0 flex-1">
              <NavTabItem href={href} label={label} active={active} Icon={Icon} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
