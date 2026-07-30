"use client";

import Link from "next/link";

type CommunityWriteFabProps = {
  isLoggedIn: boolean;
};

export function CommunityWriteFab({ isLoggedIn }: CommunityWriteFabProps) {
  const href = isLoggedIn ? "/community/new" : "/login?next=%2Fcommunity%2Fnew";
  const label = isLoggedIn ? "글 작성" : "로그인 후 글 작성";

  return (
    <Link
      href={href}
      className="community-fab shell-focus-ring"
      aria-label={label}
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
