export const AUTH_ERROR_MESSAGES = {
  VALIDATION_ERROR: "이메일과 비밀번호를 입력해 주세요.",
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
  UNAUTHORIZED: "로그인이 필요합니다.",
  KAKAO_NOT_CONFIGURED: "카카오 로그인 설정이 완료되지 않았습니다.",
  INTERNAL_SERVER_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  PASSWORD_MISMATCH: "비밀번호가 일치하지 않습니다.",
  RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  DRAFT_EXPIRED: "회원가입 세션이 만료되었습니다. 처음부터 다시 시도해 주세요.",
  INVALID_CODE: "인증 코드가 올바르지 않습니다.",
  CODE_EXPIRED: "인증 코드가 만료되었습니다. 다시 발송해 주세요.",
  EMAIL_ALREADY_REGISTERED: "이미 가입된 이메일입니다. 로그인해 주세요.",
  ONBOARDING_INCOMPLETE: "온보딩을 먼저 완료해 주세요.",
} as const;

export const KAKAO_AUTH_ERROR_MESSAGES: Record<string, string> = {
  kakao_not_configured: AUTH_ERROR_MESSAGES.KAKAO_NOT_CONFIGURED,
  kakao_bad_credentials:
    "카카오 앱 인증 정보가 올바르지 않습니다. REST API 키와 Client Secret(코드)을 .env에 확인해 주세요.",
  kakao_denied: "카카오 로그인이 취소되었습니다.",
  kakao_invalid_request: "카카오 로그인 요청이 올바르지 않습니다.",
  kakao_invalid_state: "로그인 세션이 만료되었습니다. 다시 시도해 주세요.",
  kakao_failed: "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

const LEGACY_ENGLISH_MESSAGES: Record<string, string> = {
  "email and password are required": AUTH_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid email or password": AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
  "Login required": AUTH_ERROR_MESSAGES.UNAUTHORIZED,
  "Kakao OAuth is not configured": AUTH_ERROR_MESSAGES.KAKAO_NOT_CONFIGURED,
  "Internal server error": AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
};

export function getAuthErrorMessage(code?: string | null, fallback?: string | null) {
  if (code && code in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES];
  }

  if (fallback && LEGACY_ENGLISH_MESSAGES[fallback]) {
    return LEGACY_ENGLISH_MESSAGES[fallback];
  }

  return fallback ?? "로그인에 실패했습니다.";
}

export function getKakaoAuthErrorMessage(errorKey?: string | null) {
  if (!errorKey) return null;
  return KAKAO_AUTH_ERROR_MESSAGES[errorKey] ?? "로그인에 실패했습니다.";
}
