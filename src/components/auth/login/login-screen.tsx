"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { GliaAuthFooter } from "@/components/auth/glia/glia-auth-footer";
import { KakaoLoginButton, LoginErrorAlert } from "@/components/auth/login/kakao-login-button";
import { LoginForm } from "@/components/auth/login/login-form";

type LoginScreenProps = {
  kakaoEnabled: boolean;
};

function LoginScreenSkeleton() {
  return (
    <div className="glia-auth__skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
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
    <>
      <LoginErrorAlert />

      {showEmailForm ? (
        <>
          {kakaoEnabled && (
            <button type="button" onClick={backToPrimaryLogin} className="glia-auth__back">
              <ChevronLeft size={16} strokeWidth={2} className="glia-auth__back-icon" />
              카카오로 시작하기
            </button>
          )}

          <LoginForm />
        </>
      ) : (
        <>
          <KakaoLoginButton />

          <button type="button" onClick={openEmailLogin} className="glia-auth__secondary">
            다른 방법으로 로그인
          </button>
        </>
      )}

      <GliaAuthFooter active="login" />
    </>
  );
}

export function LoginScreen({ kakaoEnabled }: LoginScreenProps) {
  return (
    <Suspense fallback={<LoginScreenSkeleton />}>
      <LoginScreenContent kakaoEnabled={kakaoEnabled} />
    </Suspense>
  );
}
