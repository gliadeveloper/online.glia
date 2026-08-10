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
        className={`header-auth-trust header-auth-trust--mypage shell-focus-ring ${typoRoleClass("bodySecondary")}`}
      >
        마이페이지
      </Link>
    );
  }

  return (
    <Link
      href={loginHref}
      className={`header-auth-trust header-auth-trust--login shell-focus-ring ${typoRoleClass("bodySecondary")}`}
    >
      로그인
    </Link>
  );
}
