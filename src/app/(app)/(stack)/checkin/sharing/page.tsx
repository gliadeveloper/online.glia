import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { CheckInAccessManager } from "@/components/checkin/check-in-access-manager";
import { listCheckInAccesses } from "@/lib/checkin-access";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

export default async function CheckInSharingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkin/sharing");
  const activeCoaches = await listCheckInAccesses(user.id);
  return <AppStackPage className="check-in-access-page"><StackNavTitle title="코치 접근 관리" /><div className="check-in-access-page__intro"><p>코치 공유</p><h1>내 기록을 볼 코치를 관리하세요</h1></div><CheckInAccessManager initialActiveCoaches={activeCoaches} /></AppStackPage>;
}
