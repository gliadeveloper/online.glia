import { redirect } from "next/navigation";
import { Suspense } from "react";

import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/session";
import { BrandMark } from "@/components/shell/brand-mark";
import { KakaoLoginButton, LoginErrorAlert } from "@/app/login/kakao-login-button";
import { LoginForm } from "@/app/login/login-form";
import { getKakaoConfig } from "@/lib/kakao-auth";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) {
    redirect(resolvePostLoginPath(next, user.role));
  }

  const kakaoEnabled = Boolean(getKakaoConfig());

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]">
      <header className="mx-auto flex w-full max-w-md items-center px-4 py-6">
        <BrandMark />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 px-4 pb-10">
        <section className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 shadow-sm">
          <header className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">로그인</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              강의 · 코칭 · 데일리 체크인을 이용하려면 로그인하세요.
            </p>
          </header>

          <div className="space-y-6">
            <Suspense fallback={null}>
              <LoginErrorAlert />
            </Suspense>

            {kakaoEnabled && (
              <Suspense fallback={null}>
                <KakaoLoginButton />
              </Suspense>
            )}

            {kakaoEnabled && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" aria-hidden="true" />
                <span className="text-xs text-[var(--color-text-secondary)]">또는 이메일로 로그인</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" aria-hidden="true" />
              </div>
            )}

            <Suspense
              fallback={
                <p className="text-sm text-[var(--color-text-secondary)]">폼을 불러오는 중...</p>
              }
            >
              <LoginForm />
            </Suspense>

            {!kakaoEnabled && process.env.NODE_ENV === "development" && (
              <p className="rounded-[var(--radius-md)] bg-sky-50 px-4 py-3 text-xs text-sky-900">
                카카오 로그인: `.env`에 `KAKAO_REST_API_KEY`, `KAKAO_REDIRECT_URI`를 설정하세요.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
