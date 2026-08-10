import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFootnote, AppPanel, AppStackPage } from "@/components/app";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { ProfileEditForm } from "@/components/mypage/profile-edit-form";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getMyProfileForEdit } from "@/lib/profile";
import { getCurrentUser } from "@/lib/session";

export default async function MyPageEditPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mypage/edit");
  }

  const profile = await getMyProfileForEdit(user.id);
  if (!profile) {
    redirect("/login?next=/mypage/edit");
  }

  return (
    <AppStackPage>
      <StackNavTitle title="프로필 수정" />

      <TabPageHeader
        eyebrow="Profile"
        title="프로필"
        titleAccent="수정"
        description="이름과 소개 정보를 업데이트하세요."
        variant="stack"
      />

      <AppPanel>
        <ProfileEditForm
          initial={{
            name: profile.name ?? "",
            headline: profile.profile?.headline ?? "",
            bio: profile.profile?.bio ?? "",
            avatarUrl: profile.profile?.avatarUrl ?? "",
          }}
        />
      </AppPanel>

      <AppFootnote>
        이메일 변경은 지원하지 않습니다.{" "}
        <Link href="/mypage" className="corp-trust-link corp-trust-focus rounded-sm">
          마이페이지로 돌아가기
        </Link>
      </AppFootnote>
    </AppStackPage>
  );
}
