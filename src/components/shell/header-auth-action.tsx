"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { typoRoleClass } from "@/lib/typography";

type HeaderAuthActionProps = {
  isLoggedIn: boolean;
};

export function HeaderAuthAction({ isLoggedIn }: HeaderAuthActionProps) {
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  if (isLoggedIn) {
    return (
      <Link
        href="/mypage"
        aria-current={pathname.startsWith("/mypage") ? "page" : undefined}
        className={`shell-focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 py-2 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] ${typoRoleClass("bodySecondary")}`}
      >
        마이페이지
      </Link>
    );
  }

  return (
    <Link
      href={loginHref}
      className={`shell-focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 py-2 font-medium text-[var(--color-action-primary)] hover:bg-[var(--color-surface-muted)] ${typoRoleClass("bodySecondary")}`}
    >
      로그인
    </Link>
  );
}
