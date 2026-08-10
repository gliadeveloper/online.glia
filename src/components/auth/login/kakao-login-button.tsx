"use client";

import { useSearchParams } from "next/navigation";

import { getKakaoAuthErrorMessage } from "@/lib/auth-errors";

export function KakaoLoginButton() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const href = next
    ? `/api/auth/kakao?next=${encodeURIComponent(next)}`
    : "/api/auth/kakao";

  return (
    <a
      href={href}
      className="auth-trust-focus flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#FEE500] px-4 py-3 text-sm font-bold text-[#191919] shadow-[0_4px_14px_0_rgba(254,229,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f5dc00] hover:shadow-[0_6px_18px_0_rgba(254,229,0,0.4)]"
    >
      <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.78-.2.74-.72 2.56-.82 2.95-.13.52.19.51.4.37.17-.11 2.7-1.83 3.8-2.58.58.08 1.18.13 1.8.13 5.52 0 10-3.58 10-8.05C22 6.58 17.52 3 12 3Z"
        />
      </svg>
      카카오로 3초 만에 시작하기
      <span className="sr-only">카카오 계정으로 로그인</span>
    </a>
  );
}

export function LoginErrorAlert() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  return (
    <p role="alert" className="auth-trust-alert-error">
      {getKakaoAuthErrorMessage(error)}
    </p>
  );
}
