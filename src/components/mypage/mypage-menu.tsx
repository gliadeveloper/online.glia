import Link from "next/link";

import type { UserRole } from "@/generated/prisma/client";
import type { MyPageData } from "@/lib/mypage";

type MyPageMenuProps = {
  stats: MyPageData["stats"];
  role: UserRole;
};

type MenuItem = {
  href: string;
  label: string;
  hint: string;
};

export function MyPageMenu({ stats, role }: MyPageMenuProps) {
  const items: MenuItem[] = [
    {
      href: "/learning",
      label: "내 학습",
      hint: `${stats.enrollmentCount}개 수강 중`,
    },
    {
      href: "/checkin",
      label: "체크인",
      hint:
        stats.dailyCheckInDone && stats.weeklyCheckInDone
          ? "오늘·이번 주 완료"
          : stats.dailyCheckInDone
            ? "주간 남음"
            : stats.weeklyCheckInDone
              ? "데일리 남음"
              : "기록하기",
    },
    {
      href: "/orders",
      label: "주문 내역",
      hint: stats.orderCount > 0 ? `${stats.orderCount}건` : "주문 없음",
    },
  ];

  if (stats.entitlementCount > 0) {
    items.splice(2, 0, {
      href: "/coaching",
      label: "코칭",
      hint: `${stats.entitlementCount}개 이용 가능`,
    });
  }

  if (role === "ADMIN") {
    items.push({
      href: "/admin",
      label: "관리 콘솔",
      hint: "관리자",
    });
  }

  if (role === "COACH") {
    items.push({
      href: "/coach",
      label: "코치 포털",
      hint: "세션·공유·피드백",
    });
  }

  return (
    <nav className="glia-mypage__menu" aria-label="마이페이지 메뉴">
      <ul className="glia-mypage__list">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="glia-mypage__row">
              <span className="glia-mypage__row-label">{item.label}</span>
              <span className="glia-mypage__row-meta">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
