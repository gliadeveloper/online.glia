"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AuthPageFooter } from "@/components/auth/corporate-trust/auth-page-footer";
import { KakaoLoginButton, LoginErrorAlert } from "@/components/auth/login/kakao-login-button";
import { LoginForm } from "@/components/auth/login/login-form";

type LoginScreenProps = {
  kakaoEnabled: boolean;
};

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginScreenSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-11 rounded-full bg-slate-100" />
      <div className="h-11 rounded-lg bg-slate-100" />
      <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
        <div className="mx-auto h-4 w-56 rounded bg-slate-100" />
        <div className="mx-auto h-4 w-48 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function LoginScreenContent({ kakaoEnabled }: LoginScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showEmailForm = searchParams.get("method") === "email" || !kakaoEnabled;

  function openEmailLogin() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("method", "email");
    router.push(`/login?${params.toString()}`, { scroll: false });
  }

  function backToPrimaryLogin() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("method");
    const query = params.toString();
    router.push(query ? `/login?${query}` : "/login", { scroll: false });
  }

  return (
    <div className="space-y-5">
      <LoginErrorAlert />

      {showEmailForm ? (
        <>
          {kakaoEnabled && (
            <button
              type="button"
              onClick={backToPrimaryLogin}
              className="auth-trust-focus group inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-indigo-600 transition-colors hover:text-violet-600"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                <ChevronLeftIcon />
              </span>
              카카오로 시작하기
            </button>
          )}

          <LoginForm />
        </>
      ) : (
        <>
          <KakaoLoginButton />

          <button
            type="button"
            onClick={openEmailLogin}
            className="auth-trust-btn-secondary auth-trust-focus"
          >
            다른 방법으로 로그인
          </button>
        </>
      )}

      <AuthPageFooter active="login" />
    </div>
  );
}

export function LoginScreen({ kakaoEnabled }: LoginScreenProps) {
  return (
    <Suspense fallback={<LoginScreenSkeleton />}>
      <LoginScreenContent kakaoEnabled={kakaoEnabled} />
    </Suspense>
  );
}
