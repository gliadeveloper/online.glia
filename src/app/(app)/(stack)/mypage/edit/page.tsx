import Link from "next/link";
import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { ProfileEditForm } from "@/components/mypage/profile-edit-form";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getMyProfileForEdit, profileAvatarSrc } from "@/lib/profile";
import { getCurrentUser } from "@/lib/session";

import "@/components/mypage/mypage-glia.css";

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
    <AppStackPage className="mypage-page">
      <StackNavTitle title="프로필 수정" />

      <div className="glia-mypage">
        <header className="glia-mypage__head">
          <p className="glia-mypage__kicker">Profile</p>
          <h1 className="glia-mypage__title">프로필 수정</h1>
          <p className="glia-mypage__lede">이름, 소개, 프로필 사진을 업데이트하세요.</p>
        </header>

        <ProfileEditForm
          initial={{
            name: profile.name ?? "",
            headline: profile.profile?.headline ?? "",
            bio: profile.profile?.bio ?? "",
            avatarUrl: profileAvatarSrc(profile.profile?.avatarUrl),
          }}
        />

        <p className="glia-mypage__note">
          이메일 변경은 지원하지 않습니다. <Link href="/mypage">마이페이지로 돌아가기</Link>
        </p>
      </div>
    </AppStackPage>
  );
}
