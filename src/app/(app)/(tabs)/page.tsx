import { HomeAlerts } from "@/components/home/home-alerts";
import { HomeCheckin } from "@/components/home/home-checkin";
import { HomeContinue } from "@/components/home/home-continue";
import { HomeDiscover } from "@/components/home/home-discover";
import { HomeShortcuts } from "@/components/home/home-shortcuts";
import { getHomePageData } from "@/lib/home";
import { getCurrentUser } from "@/lib/session";

import "@/components/home/home.css";

export default async function HomePage() {
  const user = await getCurrentUser();
  const home = await getHomePageData(user);

  return (
    <div className="glia-home">
      <h1 className="sr-only">홈</h1>
      <HomeCheckin checkin={home.checkin} />
      <div className="glia-home__feed">
        <HomeAlerts items={home.alerts} />
        <HomeShortcuts items={home.shortcuts} />
        <HomeContinue course={home.continueCourse} coaching={home.lastCoaching} />
        <HomeDiscover products={home.products} priority={home.discoverPriority} />
      </div>
    </div>
  );
}
