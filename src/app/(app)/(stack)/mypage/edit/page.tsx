import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFootnote, AppPanel, AppStackPage } from "@/components/app";
import { ProfileEditForm } from "@/components/mypage/profile-edit-form";
import { Typography } from "@/components/typography/typography";
import { getMyProfileForEdit } from "@/lib/profile";
import { StackNavTitle } from "@/lib/stack-nav-context";
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

      <header className="app-section">
        <Typography as="h1" role="pageTitle" weight="semibold" color="primary" className="sr-only lg:not-sr-only">
          프로필 수정
        </Typography>
        <Typography as="p" role="bodySecondary" color="secondary" className="sr-only lg:not-sr-only">
          이름과 프로필 정보를 변경할 수 있습니다.
        </Typography>
      </header>

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
        <Link href="/mypage" className="shell-focus-ring">
          <Typography as="span" role="bodySecondary" weight="medium" color="action">
            마이페이지로 돌아가기
          </Typography>
        </Link>
      </AppFootnote>
    </AppStackPage>
  );
}
