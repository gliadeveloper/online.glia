import { redirect } from "next/navigation";

import { AppSection, AppSectionHeader, AppStackPage } from "@/components/app";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { LogoutButton } from "@/components/mypage/logout-button";
import { MyPageMenu } from "@/components/mypage/mypage-menu";
import { MyPageProfileSummary } from "@/components/mypage/mypage-profile-summary";
import { getMyPageData } from "@/lib/mypage";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

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
    <AppStackPage>
      <StackNavTitle title="마이페이지" />

      <TabPageHeader
        eyebrow="Account"
        title="내"
        titleAccent="프로필"
        description="계정 정보와 학습 활동을 관리하세요."
        variant="stack"
      />

      <MyPageProfileSummary data={data} />
      <MyPageMenu stats={data.stats} role={user.role} />

      <AppSection labelledBy="mypage-account-heading">
        <AppSectionHeader title="계정" titleId="mypage-account-heading" />
        <LogoutButton />
      </AppSection>
    </AppStackPage>
  );
}
