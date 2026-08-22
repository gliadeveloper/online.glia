"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavActive, primaryNavItems } from "@/components/shell/nav-items";
import { typoRoleClass } from "@/lib/typography";

type PrimaryNavInlineProps = {
  className?: string;
};

export function PrimaryNavInline({ className = "" }: PrimaryNavInlineProps) {
  const pathname = usePathname();

  return (
    <nav
      id="primary-nav"
      aria-label="주요 메뉴"
      data-slot="primary-nav-inline"
      className={`primary-nav-trust ${className}`}
    >
      <ul className="primary-nav-inline__list">
        {primaryNavItems.map((item) => {
          const { href, label, Icon } = item;
          const exact = "exact" in item ? item.exact : undefined;
          const active = isNavActive(pathname, href, exact);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                className={`primary-nav-inline__link shell-focus-ring ${typoRoleClass("bodySecondary")}`}
              >
                <Icon className="size-5 shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
