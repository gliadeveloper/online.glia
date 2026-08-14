"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { KakaoLoginButton } from "@/components/auth/login/kakao-login-button";
import { SignupStepCard, SignupSuspenseFallback } from "@/components/auth/signup/signup-step-card";
import { getAuthErrorMessage } from "@/lib/auth-errors";

function SignupLandingContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const emailHref = next ? `/signup/email?next=${encodeURIComponent(next)}` : "/signup/email";

  return (
    <SignupStepCard
      title="온라인 글리아와"
      titleAccent="함께 시작하기"
      description="카카오 또는 이메일로 간편하게 가입하고 강의 · 코칭 · 체크인을 시작해 보세요."
    >
      <div className="space-y-4">
        <KakaoLoginButton />
        <Link href={emailHref} className="auth-trust-btn-secondary auth-trust-focus">
          이메일로 시작하기
        </Link>
        <p className="border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href={loginHref} className="auth-trust-link auth-trust-focus rounded-sm">
            로그인
          </Link>
        </p>
      </div>
    </SignupStepCard>
  );
}

export function SignupLandingScreen() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <SignupLandingContent />
    </Suspense>
  );
}

export function SignupEmailScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next");
  const backHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, passwordConfirm }),
      });

      const data = (await response.json()) as {
        duplicate?: boolean;
        account?: { email: string; maskedName: string; createdAt: string };
        skipEmailVerification?: boolean;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }

      const nextQuery = next ? `&next=${encodeURIComponent(next)}` : "";
      const nextPath = next ? `?next=${encodeURIComponent(next)}` : "";

      if (data.duplicate && data.account) {
        sessionStorage.setItem(
          "glia_signup_pending",
          JSON.stringify({ email, password, passwordConfirm }),
        );
        const params = new URLSearchParams({
          email,
          maskedEmail: data.account.email,
          maskedName: data.account.maskedName,
          createdAt: data.account.createdAt,
        });
        router.push(
          `/signup/duplicate?${params.toString()}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
        );
        return;
      }

      router.push(
        data.skipEmailVerification
          ? `/signup/terms${nextPath}`
          : `/signup/verify?email=${encodeURIComponent(email)}${nextQuery}`,
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignupStepCard
      backHref={backHref}
      title="이메일로"
      titleAccent="시작하기"
      description="비밀번호는 8자 이상 32자 이하, 영문 대소문자·숫자·특수문자 중 2가지 이상 조합이 필요합니다."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-semibold text-slate-700">
            이메일
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="auth-trust-input"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm font-semibold text-slate-700">
            비밀번호
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="auth-trust-input"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password-confirm" className="text-sm font-semibold text-slate-700">
            비밀번호 확인
          </label>
          <input
            id="signup-password-confirm"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className="auth-trust-input"
            required
          />
          {passwordConfirm && password !== passwordConfirm ? (
            <p className="text-sm text-slate-500">비밀번호가 일치하지 않습니다.</p>
          ) : passwordConfirm ? (
            <p className="auth-trust-alert-success py-2">비밀번호 일치</p>
          ) : null}
        </div>

        {error ? <p className="auth-trust-alert-error">{error}</p> : null}

        <button type="submit" disabled={loading} className="auth-trust-btn-primary auth-trust-focus w-full">
          {loading ? "확인 중..." : "다음"}
        </button>
      </form>
    </SignupStepCard>
  );
}
