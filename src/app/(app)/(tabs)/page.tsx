import { CoachingSessionsFeedSection } from "@/components/home/coaching-sessions-feed-section";
import { EnrolledCoursesFeedSection } from "@/components/home/enrolled-courses-feed-section";
import { FeaturedProductsSection } from "@/components/home/featured-products-section";
import { HomeBrandHero, HomeHeroDesktop } from "@/components/home/home-hero";
import { getCheckInOverview } from "@/lib/forms";
import { getCurrentUser } from "@/lib/session";

function formatTodayLabel(timezone: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: timezone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export default async function HomePage() {
  const user = await getCurrentUser();

  let todayLabel = formatTodayLabel("Asia/Seoul");
  let checkInDateKey: string | undefined;
  let completed: boolean | undefined;
  const displayName = user?.name ?? null;

  if (user) {
    const overview = await getCheckInOverview(user.id);
    const daily = overview.find((item) => item.form.purpose === "DAILY_CHECKIN");

    if (daily) {
      todayLabel = formatTodayLabel(daily.form.timezone);
      checkInDateKey = daily.periodKey;
      completed = daily.hasSubmission;
    }
  }

  const heroProps = {
    isLoggedIn: !!user,
    displayName,
    todayLabel,
    checkInDateKey,
    completed,
  };

  return (
    <div className="home-screen">
      <h1 className="sr-only">홈</h1>

      <HomeBrandHero {...heroProps} />
      <HomeHeroDesktop {...heroProps} />

      <div className="home-feed px-4 lg:px-0">
        {user && <EnrolledCoursesFeedSection userId={user.id} />}
        {user && <CoachingSessionsFeedSection userId={user.id} limit={5} />}
        <FeaturedProductsSection userId={user?.id} />
      </div>
    </div>
  );
}
