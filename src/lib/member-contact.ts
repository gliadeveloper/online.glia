import type { EmailKind } from "@/generated/prisma/browser";

export const memberOpsSelect = {
  id: true,
  name: true,
  nickname: true,
  email: true,
  phoneNumber: true,
} as const;

export type MemberOpsIdentity = {
  name: string | null;
  nickname: string | null;
  email: string;
  phoneNumber?: string | null;
};

export type MemberContactSnapshot = {
  name: string;
  phoneNumber: string;
  email: string;
  emailKind: EmailKind;
  needsEmail: boolean;
  complete: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlaceholderEmail(email: string | null | undefined, emailKind?: EmailKind | null) {
  if (!email?.trim()) return true;
  if (emailKind === "PLACEHOLDER") return true;
  return email.trim().toLowerCase().endsWith("@oauth.local");
}

export function opsMemberName(user: MemberOpsIdentity) {
  return user.name?.trim() || user.nickname?.trim() || user.email;
}

export function normalizePhoneNumber(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function formatPhoneNumber(input: string | null | undefined) {
  if (!input) return "";
  const digits = normalizePhoneNumber(input);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

export function validateLegalName(input: string) {
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { ok: false as const, message: "이름은 2~20자로 입력해 주세요." };
  }
  if (!/^[가-힣a-zA-Z][가-힣a-zA-Z·\s]*$/.test(trimmed)) {
    return { ok: false as const, message: "이름은 한글 또는 영문만 입력할 수 있어요." };
  }
  return { ok: true as const, value: trimmed };
}

export function validatePhoneNumber(input: string) {
  const digits = normalizePhoneNumber(input);
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return { ok: false as const, message: "휴대폰 번호를 확인해 주세요." };
  }
  return { ok: true as const, value: digits };
}

export function validateContactEmail(input: string) {
  const email = input.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.endsWith("@oauth.local")) {
    return { ok: false as const, message: "이메일 주소를 확인해 주세요." };
  }
  return { ok: true as const, value: email };
}

export function isContactComplete(user: {
  name: string | null;
  phoneNumber: string | null;
  email: string;
  emailKind: EmailKind;
}) {
  return Boolean(user.name?.trim() && user.phoneNumber?.trim() && !isPlaceholderEmail(user.email, user.emailKind));
}

export function toContactSnapshot(user: {
  name: string | null;
  phoneNumber: string | null;
  email: string;
  emailKind: EmailKind;
}): MemberContactSnapshot {
  return {
    name: user.name?.trim() ?? "",
    phoneNumber: formatPhoneNumber(user.phoneNumber),
    email: isPlaceholderEmail(user.email, user.emailKind) ? "" : user.email,
    emailKind: user.emailKind,
    needsEmail: isPlaceholderEmail(user.email, user.emailKind),
    complete: isContactComplete(user),
  };
}

