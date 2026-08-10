import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthPageCard } from "@/components/auth/corporate-trust/auth-page-card";
import { AuthPageFooter } from "@/components/auth/corporate-trust/auth-page-footer";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/session";

type FindAccountPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function FindAccountContent({ loginHref }: { loginHref: string }) {
  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-500">
        계정 찾기 기능은 준비 중입니다. 카카오로 로그인하거나 고객센터로 문의해 주세요.
      </p>

      <Link href={loginHref} className="auth-trust-btn-primary auth-trust-focus w-full">
        로그인으로 돌아가기
      </Link>

      <AuthPageFooter active="find-account" />
    </div>
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
    <AuthPageCard
      title="로그인 계정"
      titleAccent="찾기"
      description="가입하신 이메일 또는 카카오 계정으로 로그인 정보를 찾을 수 있습니다."
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />}>
        <FindAccountContent loginHref={loginHref} />
      </Suspense>
    </AuthPageCard>
  );
}
