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
      className={className}
    >
      <ul className="flex items-center gap-1">
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
                className={`shell-focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 transition-colors ${typoRoleClass("bodySecondary")} ${
                  active
                    ? "font-semibold text-[var(--color-text-primary)]"
                    : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                }`}
                style={{
                  transitionDuration: "var(--motion-duration-normal)",
                  transitionTimingFunction: "var(--motion-ease-standard)",
                }}
              >
                <Icon filled={active} className="size-5 shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
