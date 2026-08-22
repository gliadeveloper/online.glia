import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { GliaAuthFooter } from "@/components/auth/glia/glia-auth-footer";
import { GliaAuthPage } from "@/components/auth/glia/glia-auth-page";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/session";

type FindAccountPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function FindAccountContent({ loginHref }: { loginHref: string }) {
  return (
    <>
      <p className="glia-auth__note">
        계정 찾기 기능은 준비 중입니다. 카카오로 로그인하거나 고객센터로 문의해 주세요.
      </p>

      <Link href={loginHref} className="glia-auth__submit">
        로그인으로 돌아가기
      </Link>

      <GliaAuthFooter active="find-account" />
    </>
  );
}

export default async function FindAccountPage({ searchParams }: FindAccountPageProps) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) {
    redirect(resolvePostLoginPath(next, user.role));
  }

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <GliaAuthPage
      eyebrow="Find account"
      title="로그인 계정"
      titleAccent="찾기"
      description="가입하신 이메일 또는 카카오 계정으로 로그인 정보를 찾을 수 있습니다."
    >
      <Suspense fallback={<div className="glia-auth__skeleton" aria-hidden="true"><span /><span /></div>}>
        <FindAccountContent loginHref={loginHref} />
      </Suspense>
    </GliaAuthPage>
  );
}
