import Link from "next/link";

import { MobileGlobalHeader } from "@/components/shell/mobile-global-header";
import { Typography } from "@/components/typography/typography";
import { checkInReportPath } from "@/lib/checkin-routes";
import { typoRoleClass } from "@/lib/typography";

type HomeHeroProps = {
  isLoggedIn: boolean;
  displayName?: string | null;
  todayLabel: string;
  /** YYYY-MM-DD — logged-in CTA deep-links to today's daily form */
  checkInDateKey?: string;
  completed?: boolean;
};

function useHomeHeroCopy({
  isLoggedIn,
  displayName,
  checkInDateKey,
  completed,
}: Pick<HomeHeroProps, "isLoggedIn" | "displayName" | "checkInDateKey" | "completed">) {
  const greeting = isLoggedIn && displayName
    ? `안녕하세요, ${displayName}님`
    : "안녕하세요";

  const prompt = isLoggedIn
    ? "오늘 하루는 어떠셨나요?"
    : "로그인하고 오늘의 기록을 시작해 보세요.";

  const ctaLabel = !isLoggedIn
    ? "로그인하고 기록하기"
    : completed
      ? "오늘 리포트 보기"
      : "지금 기분 기록하기";

  const dailyPath = checkInDateKey
    ? completed
      ? checkInReportPath("daily", checkInDateKey)
      : `/checkin/daily/${checkInDateKey}`
    : "/checkin";
  const ctaHref = isLoggedIn ? dailyPath : "/login?next=%2Fcheckin";

  return {
    greeting,
    prompt,
    ctaLabel,
    ctaHref,
    completed: !!completed && isLoggedIn,
    showNameAccent: !!(isLoggedIn && displayName),
    displayName: displayName ?? null,
  };
}

function HomeHeroContent({
  isLoggedIn,
  displayName,
  todayLabel,
  checkInDateKey,
  completed,
}: HomeHeroProps) {
  const { greeting, prompt, ctaLabel, ctaHref, completed: isCompleted, showNameAccent, displayName: name } = useHomeHeroCopy({
    isLoggedIn,
    displayName,
    checkInDateKey,
    completed,
  });

  return (
    <div className="home-hero__content">
      <div className="home-hero__intro">
        <Typography
          as="h2"
          id="home-hero-heading"
          role="display"
          weight="semibold"
          className="home-hero__greeting"
        >
          {showNameAccent && name ? (
            <>
              안녕하세요, <span className="corp-trust-gradient-text">{name}</span>님
            </>
          ) : (
            greeting
          )}
        </Typography>

        <div className="home-hero__copy">
          <Typography as="p" role="bodyCompact" weight="regular" className="home-hero__prompt">
            {prompt}
          </Typography>
          <Typography as="p" role="caption" weight="regular" className="home-hero__meta">
            {todayLabel}
          </Typography>
        </div>
      </div>

      <Link
        href={ctaHref}
        className={`home-hero__cta shell-focus-ring ${typoRoleClass("bodyCompact")}${isCompleted ? " home-hero__cta--completed" : ""}`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

/**
 * Mobile home — Home Brand Hero canvas.
 * L0 (on-hero) + hero copy/CTA share one immersive surface; feed separates at bottom surface radius.
 */
export function HomeBrandHero(props: HomeHeroProps) {
  return (
    <section aria-labelledby="home-hero-heading" className="home-hero lg:hidden">
      <div className="home-hero__inner">
        <MobileGlobalHeader variant="on-hero" isLoggedIn={props.isLoggedIn} />
        <HomeHeroContent {...props} />
      </div>
    </section>
  );
}

/**
 * Desktop home hero — contained band below unified header.
 */
export function HomeHeroDesktop(props: HomeHeroProps) {
  const { greeting, prompt, ctaLabel, ctaHref, completed: isCompleted, showNameAccent, displayName: name } = useHomeHeroCopy(props);

  return (
    <section
      aria-labelledby="home-hero-desktop-heading"
      className="home-hero-desktop hidden lg:block"
    >
      <div className="home-hero-desktop__inner rounded-[var(--radius-md)] px-8 py-8">
        <div className="home-hero-desktop__content">
          <div className="home-hero__intro">
            <Typography
              as="h2"
              id="home-hero-desktop-heading"
              role="pageTitle"
              weight="semibold"
              className="home-hero-desktop__greeting"
            >
              {showNameAccent && name ? (
                <>
                  안녕하세요, <span className="corp-trust-gradient-text">{name}</span>님
                </>
              ) : (
                greeting
              )}
            </Typography>

            <div className="home-hero-desktop__copy">
              <Typography as="p" role="bodyCompact" weight="regular" className="home-hero-desktop__prompt">
                {prompt}
              </Typography>
              <Typography as="p" role="caption" weight="regular" className="home-hero-desktop__meta">
                {props.todayLabel}
              </Typography>
            </div>
          </div>

          <Link
            href={ctaHref}
            className={`home-hero__cta home-hero-desktop__cta shell-focus-ring ${typoRoleClass("bodyCompact")}${isCompleted ? " home-hero__cta--completed" : ""}`}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
