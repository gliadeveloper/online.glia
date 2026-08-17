import Link from "next/link";

import { HomeFeedPanel } from "@/components/home/home-feed-panel";

const links = [
  { href: "/checkin", icon: "✓", label: "체크인" },
  { href: "/learning", icon: "▤", label: "수강 중 강좌" },
  { href: "/coaching", icon: "◌", label: "마지막 코칭" },
];

export function HomeQuickLinks() {
  return (
    <HomeFeedPanel aria-labelledby="home-quick-links-heading">
      <div className="home-quick-links">
        <h2 id="home-quick-links-heading" className="home-feed-panel__title">바로가기</h2>
        <div className="home-quick-links__grid">
          {links.map((item) => <Link key={item.href} href={item.href} className="home-quick-links__item"><span aria-hidden="true">{item.icon}</span><b>{item.label}</b></Link>)}
        </div>
      </div>
    </HomeFeedPanel>
  );
}
