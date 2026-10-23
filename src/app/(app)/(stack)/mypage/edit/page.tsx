import Link from "next/link";
import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { MemberContactForm } from "@/components/account/member-contact-form";
import { ProfileEditForm } from "@/components/mypage/profile-edit-form";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { toContactSnapshot } from "@/lib/member-contact";
import { getMyProfileForEdit } from "@/lib/profile";
import { profileAvatarSrc } from "@/lib/profile-avatar";
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
          <p className="glia-mypage__lede">공개 프로필과 결제·코칭용 회원 정보를 나눠 관리합니다.</p>
        </header>

        <ProfileEditForm
          initial={{
            name: profile.nickname ?? "",
            headline: profile.profile?.headline ?? "",
            bio: profile.profile?.bio ?? "",
            avatarUrl: profileAvatarSrc(profile.profile?.avatarUrl),
          }}
        />

        <section id="contact" className="glia-mypage__contact">
          <header className="glia-mypage__head">
            <p className="glia-mypage__kicker">Contact</p>
            <h2 className="glia-mypage__section-title">회원 정보</h2>
          </header>
          <MemberContactForm
            initial={toContactSnapshot({
              name: profile.name,
              phoneNumber: profile.phoneNumber,
              email: profile.email,
              emailKind: profile.emailKind,
            })}
            submitLabel="회원 정보 저장"
          />
        </section>

        <p className="glia-mypage__note">
          로그인 이메일 변경은 지원하지 않습니다. <Link href="/mypage">마이페이지로 돌아가기</Link>
        </p>
      </div>
    </AppStackPage>
  );
}
