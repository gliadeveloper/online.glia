"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";

import type { NavIconProps } from "@/components/shell/nav-icons";
import { typoRoleClass } from "@/lib/typography";

type NavTabItemProps = {
  href: string;
  label: string;
  active: boolean;
  Icon: ComponentType<NavIconProps>;
};

export function NavTabItem({ href, label, active, Icon }: NavTabItemProps) {
  const wasActive = useRef(active);
  const [settle, setSettle] = useState(false);

  useEffect(() => {
    if (active && !wasActive.current) {
      setSettle(true);
      const timer = window.setTimeout(() => setSettle(false), 360);
      wasActive.current = active;
      return () => window.clearTimeout(timer);
    }
    wasActive.current = active;
  }, [active]);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : "false"}
      data-settle={settle ? "true" : "false"}
      className={`nav-tab-item shell-focus-ring flex min-h-[var(--nav-height-mobile)] flex-1 flex-col items-center justify-center gap-[0.3125rem] px-2 py-2 ${typoRoleClass("caption")} ${
        active
          ? "font-semibold text-[var(--color-text-primary)]"
          : "font-medium text-[var(--color-text-secondary)]"
      }`}
    >
      <span className="nav-tab-icon relative flex size-6 items-center justify-center">
        <Icon filled={false} className="nav-tab-icon-outline absolute size-[22px]" />
        <Icon filled className="nav-tab-icon-filled absolute size-[22px]" />
      </span>
      <span className="nav-tab-label max-w-full truncate leading-none tracking-tight">
        {label}
      </span>
    </Link>
  );
}
