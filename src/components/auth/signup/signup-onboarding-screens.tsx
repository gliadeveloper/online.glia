"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { KakaoLoginButton } from "@/components/auth/login/kakao-login-button";
import { SignupStep, SignupSuspenseFallback } from "@/components/auth/signup/signup-step";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { AVATAR_PRESETS } from "@/lib/signup/constants";
import { validateNickname, validateUserId } from "@/lib/signup/validation";

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
          <a href="mailto:support@glia.kr" className="glia-auth__link">
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
        body: JSON.stringify({ step: "terms" }),
      });
      const data = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }
      router.push(`/signup/marketing${buildNextQuery(next)}`);
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
        </div>

        {error ? <SignupError message={error} /> : null}

        <button type="submit" disabled={!allChecked || loading} className="glia-auth__submit">
          {loading ? "처리 중..." : "필수 동의하기"}
        </button>
      </form>
    </SignupStep>
  );
}

function MarketingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(accepted: boolean) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "marketing", marketingConsent: accepted }),
      });
      const data = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }
      router.push(
        `/signup/profile?marketing=${accepted ? "1" : "0"}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignupStep
      backHref={`/signup/terms${buildNextQuery(next)}`}
      backLabel="약관으로 돌아가기"
      title="서비스 혜택 제공을 위한"
      titleAccent="동의"
      description="이벤트, 할인, 맞춤 콘텐츠 등 마케팅 정보 수신에 동의하실 수 있습니다. (선택)"
    >
      <label className="glia-auth__check glia-auth__check--bare">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          <span className="glia-auth__badge glia-auth__badge--optional">선택</span>
          마케팅 정보 수신 동의
        </span>
      </label>

      {error ? <SignupError message={error} /> : null}

      <div className="glia-auth__actions">
        <button
          type="button"
          disabled={loading}
          onClick={() => submit(consent)}
          className="glia-auth__submit"
        >
          {loading ? "처리 중..." : "동의하기"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => submit(false)}
          className="glia-auth__ghost"
        >
          동의 안 함
        </button>
      </div>
    </SignupStep>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const marketingConsent = searchParams.get("marketing") === "1";
  const [userId, setUserId] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarPresetId, setAvatarPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nicknameValid = validateNickname(nickname).ok;
  const userIdValid = validateUserId(userId.trim().toLowerCase()).ok;
  const canSubmit = userIdValid && nicknameValid && Boolean(avatarPresetId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim().toLowerCase(),
          nickname: nickname.trim(),
          avatarPresetId,
          marketingConsent,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        mode?: "email" | "kakao";
        user?: { role?: string };
      };

      if (!response.ok) {
        setError(getAuthErrorMessage(data.code, data.error));
        return;
      }

      router.push(resolvePostLoginPath(next, "USER"));
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignupStep
      backHref={`/signup/marketing${buildNextQuery(next)}`}
      backLabel="이전 단계"
      title="프로필을"
      titleAccent="만들어보세요"
      description="크리에이터를 비롯한 다른 사람들과 소통할 나만의 프로필이에요."
    >
      <form onSubmit={handleSubmit} className="glia-auth__form">
        <fieldset className="glia-auth__fields glia-auth__fields--spaced">
          <legend className="sr-only">프로필 정보</legend>

          <div className="glia-auth__field">
            <label htmlFor="profile-user-id" className="glia-auth__label">
              사용자 ID
            </label>
            <input
              id="profile-user-id"
              value={userId}
              onChange={(event) => setUserId(event.target.value.toLowerCase())}
              className="glia-auth__input"
              placeholder="예: coach_kim"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
            <p className="glia-auth__help">
              코치를 검색하고 다른 사용자가 나를 찾을 때 사용하는 ID예요. 영문 소문자, 숫자,
              밑줄로 3~20자까지 입력할 수 있어요.
            </p>
          </div>

          <div className="glia-auth__field">
            <label htmlFor="profile-nickname" className="glia-auth__label">
              닉네임
            </label>
            <input
              id="profile-nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="glia-auth__input"
              placeholder="닉네임을 입력하세요"
              required
            />
            <p className="glia-auth__help">한글 1–10자, 영문 및 숫자 2–20자까지 입력할 수 있어요.</p>
          </div>

          <div className="glia-auth__field">
            <span className="glia-auth__label">프로필 사진</span>
            <div className="glia-auth__avatars">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-selected={avatarPresetId === preset.id}
                  className="glia-auth__avatar"
                  onClick={() => setAvatarPresetId(preset.id)}
                  aria-label={preset.label}
                  aria-pressed={avatarPresetId === preset.id}
                >
                  <span
                    className="glia-auth__avatar-swatch"
                    style={{ backgroundColor: preset.color }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        {error ? <SignupError message={error} /> : null}

        <button type="submit" disabled={!canSubmit || loading} className="glia-auth__submit">
          {loading ? "저장 중..." : "프로필 저장하기"}
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

export function SignupMarketingScreen() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <MarketingContent />
    </Suspense>
  );
}

export function SignupProfileScreen() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
