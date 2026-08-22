"use client";

import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { GliaAuthFooter } from "@/components/auth/glia/glia-auth-footer";
import { KakaoLoginButton } from "@/components/auth/login/kakao-login-button";
import { SignupStep, SignupSuspenseFallback } from "@/components/auth/signup/signup-step";
import { getAuthErrorMessage } from "@/lib/auth-errors";

function SignupLandingContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const emailHref = next ? `/signup/email?next=${encodeURIComponent(next)}` : "/signup/email";

  return (
    <SignupStep
      title="온라인 글리아와"
      titleAccent="함께 시작하기"
      description="카카오 또는 이메일로 간편하게 가입하고 강의 · 코칭 · 체크인을 시작해 보세요."
    >
      <div className="glia-auth__actions">
        <KakaoLoginButton />
        <Link href={emailHref} className="glia-auth__secondary">
          이메일로 시작하기
        </Link>
      </div>

      <GliaAuthFooter active="signup" />
    </SignupStep>
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
    <SignupStep
      backHref={backHref}
      backLabel="다른 방법으로 가입"
      title="이메일로"
      titleAccent="시작하기"
      description="비밀번호는 8자 이상 32자 이하, 영문 대소문자·숫자·특수문자 중 2가지 이상 조합이 필요합니다."
    >
      <form onSubmit={handleSubmit} className="glia-auth__form">
        <fieldset className="glia-auth__fields">
          <legend className="sr-only">계정 정보</legend>

          <div className="glia-auth__field">
            <label htmlFor="signup-email" className="glia-auth__label">
              이메일
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="glia-auth__input"
              required
            />
          </div>

          <div className="glia-auth__field">
            <label htmlFor="signup-password" className="glia-auth__label">
              비밀번호
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="glia-auth__input"
              required
            />
          </div>

          <div className="glia-auth__field">
            <label htmlFor="signup-password-confirm" className="glia-auth__label">
              비밀번호 확인
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="glia-auth__input"
              required
            />
            {passwordConfirm && password !== passwordConfirm ? (
              <p className="glia-auth__help">비밀번호가 일치하지 않습니다.</p>
            ) : passwordConfirm ? (
              <p className="glia-auth__success">
                <Check size={15} strokeWidth={2.5} className="glia-auth__success-icon" />
                비밀번호 일치
              </p>
            ) : null}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="glia-auth__alert">
            <CircleAlert size={16} strokeWidth={2} className="glia-auth__alert-icon" />
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="glia-auth__submit">
          {loading ? "확인 중..." : "다음"}
        </button>
      </form>
    </SignupStep>
  );
}
