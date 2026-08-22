"use client";

import Link from "next/link";
import type { ComponentType } from "react";

import type { NavIconProps } from "@/components/shell/nav-icons";

type NavTabItemProps = {
  href: string;
  label: string;
  active: boolean;
  Icon: ComponentType<NavIconProps>;
};

export function NavTabItem({ href, label, active, Icon }: NavTabItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : "false"}
      className="nav-tab-item nav-tab-item-trust shell-focus-ring flex min-h-(--nav-height-mobile) flex-1 flex-col items-center justify-center gap-1 px-2 py-2"
    >
      <span className="nav-tab-icon flex size-5 items-center justify-center">
        <Icon className="size-5" />
      </span>
      <span className="nav-tab-label max-w-full truncate leading-none tracking-tight">
        {label}
      </span>
    </Link>
  );
}
