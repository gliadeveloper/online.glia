"use client";

import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  kakao_not_configured: "카카오 로그인 설정이 완료되지 않았습니다.",
  kakao_bad_credentials:
    "카카오 앱 인증 정보가 올바르지 않습니다. REST API 키와 Client Secret(코드)을 .env에 확인해 주세요.",
  kakao_denied: "카카오 로그인이 취소되었습니다.",
  kakao_invalid_request: "카카오 로그인 요청이 올바르지 않습니다.",
  kakao_invalid_state: "로그인 세션이 만료되었습니다. 다시 시도해 주세요.",
  kakao_failed: "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

export function KakaoLoginButton() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const href = next
    ? `/api/auth/kakao?next=${encodeURIComponent(next)}`
    : "/api/auth/kakao";

  return (
    <a
      href={href}
      className="shell-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] hover:bg-[#f5dc00]"
    >
      <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.78-.2.74-.72 2.56-.82 2.95-.13.52.19.51.4.37.17-.11 2.7-1.83 3.8-2.58.58.08 1.18.13 1.8.13 5.52 0 10-3.58 10-8.05C22 6.58 17.52 3 12 3Z"
        />
      </svg>
      카카오로 로그인
      <span className="sr-only">카카오 계정으로 로그인</span>
    </a>
  );
}

export function LoginErrorAlert() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  return (
    <p role="alert" className="rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-800">
      {ERROR_MESSAGES[error] ?? "로그인에 실패했습니다."}
    </p>
  );
}
