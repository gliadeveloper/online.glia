import Link from "next/link";

import { AppPanel } from "@/components/app";
import { Typography } from "@/components/typography/typography";
import type { MyPageData } from "@/lib/mypage";
import type { UserRole } from "@/generated/prisma/client";

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
    <section aria-labelledby="mypage-menu-heading">
      <Typography
        as="h2"
        id="mypage-menu-heading"
        role="sectionTitle"
        weight="semibold"
        color="primary"
        className="app-section-header__desc"
      >
        메뉴
      </Typography>

      <AppPanel flush className="app-list-panel">
        <ul className="app-list-panel__list">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="app-list-row shell-focus-ring">
                <div className="app-list-row__inner">
                  <Typography as="span" role="bodyCompact" weight="medium" color="primary">
                    {item.label}
                  </Typography>
                  <Typography as="span" role="bodySecondary" color="secondary">
                    {item.hint}
                  </Typography>
                </div>
                <span className="sr-only">{item.label}로 이동</span>
              </Link>
            </li>
          ))}
        </ul>
      </AppPanel>
    </section>
  );
}
