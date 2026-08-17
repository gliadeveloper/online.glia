export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 8 || password.length > 32) {
    return { ok: false, message: "비밀번호는 8자 이상 32자 이하로 입력해 주세요." };
  }

  let categories = 0;
  if (/[a-z]/.test(password)) categories += 1;
  if (/[A-Z]/.test(password)) categories += 1;
  if (/[0-9]/.test(password)) categories += 1;
  if (/[^A-Za-z0-9]/.test(password)) categories += 1;

  if (categories < 2) {
    return {
      ok: false,
      message: "영문 대소문자, 숫자, 특수문자 중 2가지 이상을 조합해 주세요.",
    };
  }

  return { ok: true };
}

export type NicknameValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type UserIdValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/** Public account identifier used when users search for a coach. */
export function validateUserId(userId: string): UserIdValidationResult {
  const trimmed = userId.trim();
  if (!trimmed) {
    return { ok: false, message: "사용자 ID를 입력해 주세요." };
  }

  if (!/^[a-z][a-z0-9_]{2,19}$/.test(trimmed)) {
    return {
      ok: false,
      message: "사용자 ID는 영문 소문자로 시작하는 3~20자의 영문 소문자, 숫자, 밑줄만 사용할 수 있어요.",
    };
  }

  return { ok: true };
}

export function validateNickname(nickname: string): NicknameValidationResult {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return { ok: false, message: "닉네임을 입력해 주세요." };
  }

  const hasHangul = /[가-힣]/.test(trimmed);
  const hangulOnly = /^[가-힣]+$/.test(trimmed);
  const latinOnly = /^[A-Za-z0-9]+$/.test(trimmed);

  if (hasHangul && hangulOnly) {
    if (trimmed.length < 1 || trimmed.length > 10) {
      return { ok: false, message: "한글 닉네임은 1~10자까지 입력할 수 있어요." };
    }
    return { ok: true };
  }

  if (latinOnly) {
    if (trimmed.length < 2 || trimmed.length > 20) {
      return { ok: false, message: "영문 및 숫자 닉네임은 2~20자까지 입력할 수 있어요." };
    }
    return { ok: true };
  }

  return {
    ok: false,
    message: "한글 1~10자, 또는 영문·숫자 2~20자만 사용할 수 있어요.",
  };
}

export function maskDisplayName(name: string | null | undefined) {
  if (!name?.trim()) return "회원";

  const trimmed = name.trim();
  if (/[가-힣]/.test(trimmed)) {
    if (trimmed.length <= 1) return "*";
    if (trimmed.length === 2) return `${trimmed[0]}*`;
    return `${trimmed[0]}${"*".repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
  }

  if (trimmed.length <= 2) return `${trimmed[0]}*`;
  return `${trimmed.slice(0, 2)}${"*".repeat(Math.max(1, trimmed.length - 3))}${trimmed.slice(-1)}`;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 3))}${local.slice(-1)}@${domain}`;
}
