import Link from "next/link";

import { HomeChrome } from "@/components/home/home-chrome";
import type { HomeCheckin as HomeCheckinData } from "@/lib/home";

type HomeCheckinProps = {
  isLoggedIn: boolean;
  checkin: HomeCheckinData;
};

export function HomeCheckin({ isLoggedIn, checkin }: HomeCheckinProps) {
  return (
    <section className="glia-home__hero" aria-labelledby="home-checkin-heading">
      <div className="glia-home__ambient" aria-hidden="true">
        <span className="glia-home__blob glia-home__blob--mint" />
        <span className="glia-home__blob glia-home__blob--blue" />
        <span className="glia-home__blob glia-home__blob--wash" />
      </div>

      <HomeChrome isLoggedIn={isLoggedIn} />

      <div className="glia-home__hero-copy">
        <p className="glia-home__date">{checkin.dateLabel}</p>
        <h2 id="home-checkin-heading" className="glia-home__greeting">
          {checkin.greeting}
        </h2>
        <p className="glia-home__headline">{checkin.headline}</p>
      </div>

      <Link
        href={checkin.href}
        className={`glia-checkin${checkin.done ? " glia-checkin--done" : ""}`}
      >
        <div className="glia-checkin__copy">
          <p className="glia-checkin__eyebrow">{checkin.done ? "오늘 완료" : "오늘의 체크인"}</p>
          <p className="glia-checkin__title">
            {checkin.done ? "기록을 다시 살펴볼까요?" : "몸과 마음의 균형을 확인해 보세요"}
          </p>
        </div>
        <span className={checkin.done ? "glia-btn glia-btn--secondary" : "glia-btn glia-btn--primary"}>
          {checkin.ctaLabel}
        </span>
      </Link>
    </section>
  );
}
