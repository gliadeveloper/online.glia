import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { LogoutButton } from "@/components/mypage/logout-button";
import { MyPageMenu } from "@/components/mypage/mypage-menu";
import { MyPageProfileSummary } from "@/components/mypage/mypage-profile-summary";
import { getMyPageData } from "@/lib/mypage";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/mypage/mypage-glia.css";

export default async function MyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/mypage");
  }

  const data = await getMyPageData(user.id);
  if (!data) {
    redirect("/login?next=/mypage");
  }

  return (
    <AppStackPage className="mypage-page">
      <StackNavTitle title="마이페이지" />

      <div className="glia-mypage">
        <header className="glia-mypage__head">
          <p className="glia-mypage__kicker">Account</p>
          <h1 className="glia-mypage__title">마이페이지</h1>
          <p className="glia-mypage__lede">계정과 학습 활동을 한곳에서 관리하세요.</p>
        </header>

        <MyPageProfileSummary data={data} />
        <MyPageMenu stats={data.stats} role={user.role} />

        <div className="glia-mypage__account">
          <LogoutButton />
        </div>
      </div>
    </AppStackPage>
  );
}
