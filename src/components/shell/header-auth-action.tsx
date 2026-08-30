"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserRole } from "@/generated/prisma/client";
import { typoRoleClass } from "@/lib/typography";

type HeaderAuthActionProps = {
  isLoggedIn: boolean;
  userRole?: UserRole | null;
};

export function HeaderAuthAction({ isLoggedIn, userRole }: HeaderAuthActionProps) {
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  if (isLoggedIn) {
    const portal =
      userRole === "COACH"
        ? { href: "/coach", label: "코치" }
        : userRole === "ADMIN"
          ? { href: "/admin", label: "관리" }
          : null;

    return (
      <div className="header-auth-trust-group">
        {portal ? (
          <Link
            href={portal.href}
            className={`header-auth-trust header-auth-trust--portal shell-focus-ring ${typoRoleClass("bodySecondary")}`}
          >
            {portal.label}
          </Link>
        ) : null}
        <Link
          href="/mypage"
          aria-current={pathname.startsWith("/mypage") ? "page" : undefined}
          className={`header-auth-trust header-auth-trust--mypage shell-focus-ring ${typoRoleClass("bodySecondary")}`}
        >
          마이페이지
        </Link>
      </div>
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
