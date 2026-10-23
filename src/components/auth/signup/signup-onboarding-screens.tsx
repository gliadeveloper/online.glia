"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import type { UserRole } from "@/generated/prisma/client";

import { KakaoLoginButton } from "@/components/auth/login/kakao-login-button";
import { SignupStep, SignupSuspenseFallback } from "@/components/auth/signup/signup-step";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { siteBusiness } from "@/lib/site-business";
import { getAuthErrorMessage } from "@/lib/auth-errors";

function buildNextQuery(next: string | null) {
  return next ? `?next=${encodeURIComponent(next)}` : "";
}

function SignupError({ message }: { message: string }) {
  return (
    <p role="alert" className="glia-auth__alert">
      <CircleAlert size={16} strokeWidth={2} className="glia-auth__alert-icon" />
      {message}
    </p>
  );
}

function DuplicateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";
  const maskedEmail = searchParams.get("maskedEmail") ?? email;
  const maskedName = searchParams.get("maskedName") ?? "회원";
  const createdAt = searchParams.get("createdAt");
  const next = searchParams.get("next");

  const loginHref = `/login?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueSignup() {
    const raw = sessionStorage.getItem("glia_signup_pending");
    if (!raw) {
      router.push(`/signup/email${buildNextQuery(next)}`);
      return;
    }

    const pending = JSON.parse(raw) as {
      email: string;
      password: string;
      passwordConfirm: string;
    };

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending, forceDraft: true }),
      });
      const data = (await response.json()) as {
        skipEmailVerification?: boolean;
        error?: string;
        code?: string;
      };
      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }
      router.push(
        data.skipEmailVerification
          ? `/signup/terms${buildNextQuery(next)}`
          : `/signup/verify?email=${encodeURIComponent(pending.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = useMemo(() => {
    if (!createdAt) return null;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(createdAt));
  }, [createdAt]);

  return (
    <SignupStep
      backHref={`/signup/email${buildNextQuery(next)}`}
      backLabel="이메일로 돌아가기"
      title={`${maskedEmail}로 가입된`}
      titleAccent="계정이 있어요"
      description="기존 계정으로 로그인하거나, 입력한 이메일로 가입을 계속할 수 있습니다."
    >
      <div className="glia-auth__summary">
        {formattedDate ? (
          <span className="glia-auth__summary-label">가입일 {formattedDate}</span>
        ) : null}
        <p className="glia-auth__summary-value">{maskedEmail}</p>
        <p className="glia-auth__summary-meta">닉네임 {maskedName}</p>
      </div>

      {error ? <SignupError message={error} /> : null}

      <div className="glia-auth__actions">
        <Link href={loginHref} className="glia-auth__submit">
          기존 계정으로 로그인
        </Link>
        <button
          type="button"
          disabled={loading}
          onClick={continueSignup}
          className="glia-auth__secondary"
        >
          {loading ? "처리 중..." : `${email}로 계속 가입하기`}
        </button>
        <KakaoLoginButton />
      </div>

      <footer className="glia-auth__footer">
        <p>
          도움이 필요하신가요?{" "}
          <a href={`mailto:${siteBusiness.supportEmail}`} className="glia-auth__link">
            문의하기
          </a>
        </p>
      </footer>
    </SignupStep>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const next = searchParams.get("next");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string; code?: string };

      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }

      router.push(`/signup/terms${buildNextQuery(next)}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignupStep
      backHref={`/signup/email${buildNextQuery(next)}`}
      backLabel="이메일로 돌아가기"
      title="이메일"
      titleAccent="인증"
      description={`${email || "입력하신 이메일"}로 발송된 6자리 코드를 입력해 주세요.`}
    >
      <form onSubmit={handleSubmit} className="glia-auth__form">
        <div className="glia-auth__field">
          <label htmlFor="verify-code" className="glia-auth__label">
            인증 코드
          </label>
          <input
            id="verify-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            className="glia-auth__input glia-auth__input--code"
            required
          />
          {process.env.NODE_ENV === "development" ? (
            <p className="glia-auth__help">개발 환경: 터미널에 인증 코드가 출력됩니다.</p>
          ) : null}
        </div>

        {error ? <SignupError message={error} /> : null}

        <button type="submit" disabled={loading} className="glia-auth__submit">
          {loading ? "확인 중..." : "인증 완료"}
        </button>
      </form>
    </SignupStep>
  );
}

function TermsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [age14, setAge14] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = terms && privacy && age14;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!allChecked) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "terms", marketingConsent: marketing }),
      });
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        user?: { role?: UserRole };
      };
      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }
      router.push(resolvePostLoginPath(next, data.user?.role ?? "USER" satisfies UserRole));
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignupStep
      title="서비스 이용 약관에"
      titleAccent="동의해 주세요"
      description="온라인 글리아 이용을 위해 아래 필수 항목에 동의가 필요합니다."
    >
      <form onSubmit={handleSubmit} className="glia-auth__form">
        <div className="glia-auth__checks">
          <label className="glia-auth__check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
            />
            <span>
              <span className="glia-auth__badge glia-auth__badge--required">필수</span>
              이용 약관
            </span>
            <Link
              href="/legal/terms"
              className="glia-auth__check-doc"
              onMouseDown={(event) => event.preventDefault()}
            >
              전문
            </Link>
          </label>
          <label className="glia-auth__check">
            <input
              type="checkbox"
              checked={privacy}
              onChange={(event) => setPrivacy(event.target.checked)}
            />
            <span>
              <span className="glia-auth__badge glia-auth__badge--required">필수</span>
              개인정보 수집 및 이용 동의
            </span>
            <Link
              href="/legal/privacy"
              className="glia-auth__check-doc"
              onMouseDown={(event) => event.preventDefault()}
            >
              전문
            </Link>
          </label>
          <label className="glia-auth__check">
            <input
              type="checkbox"
              checked={age14}
              onChange={(event) => setAge14(event.target.checked)}
            />
            <span>
              <span className="glia-auth__badge glia-auth__badge--required">필수</span>
              만 14세 이상입니다
            </span>
          </label>
          <label className="glia-auth__check">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
            />
            <span>
              <span className="glia-auth__badge glia-auth__badge--optional">선택</span>
              마케팅 정보 수신 동의
            </span>
          </label>
        </div>

        {error ? <SignupError message={error} /> : null}

        <button type="submit" disabled={!allChecked || loading} className="glia-auth__submit">
          {loading ? "처리 중..." : "동의하고 시작하기"}
        </button>
      </form>
    </SignupStep>
  );
}

export function SignupDuplicateScreen() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <DuplicateContent />
    </Suspense>
  );
}

export function SignupVerifyScreen() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <VerifyContent />
    </Suspense>
  );
}

export function SignupTermsScreen() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <TermsContent />
    </Suspense>
  );
}

