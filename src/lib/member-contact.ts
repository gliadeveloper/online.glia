import type { EmailKind } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isSignupEmailVerificationEnabled } from "@/lib/signup/constants";

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

export async function getMemberContact(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      phoneNumber: true,
      email: true,
      emailKind: true,
    },
  });
  if (!user) return null;
  return toContactSnapshot(user);
}

export async function assertMemberContactComplete(userId: string) {
  const contact = await getMemberContact(userId);
  if (!contact?.complete) {
    throw new ApiError(
      "결제와 코칭 안내에 필요한 이름, 휴대폰 번호, 이메일을 먼저 입력해 주세요.",
      409,
      "CONTACT_REQUIRED",
    );
  }
  return contact;
}

export async function updateMemberContact(
  userId: string,
  input: {
    name: string;
    phoneNumber: string;
    email?: string;
  },
) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailKind: true,
    },
  });
  if (!current) {
    throw new ApiError("사용자를 찾을 수 없습니다.", 404, "NOT_FOUND");
  }

  const nameResult = validateLegalName(input.name);
  if (!nameResult.ok) {
    throw new ApiError(nameResult.message, 400, "VALIDATION_ERROR");
  }

  const phoneResult = validatePhoneNumber(input.phoneNumber);
  if (!phoneResult.ok) {
    throw new ApiError(phoneResult.message, 400, "VALIDATION_ERROR");
  }

  const needsEmail = isPlaceholderEmail(current.email, current.emailKind);
  let nextEmail = current.email;
  let nextEmailKind = current.emailKind;
  let emailVerifiedAt: Date | undefined;

  if (needsEmail) {
    const emailResult = validateContactEmail(input.email ?? "");
    if (!emailResult.ok) {
      throw new ApiError(emailResult.message, 400, "VALIDATION_ERROR");
    }

    const taken = await prisma.user.findFirst({
      where: { email: emailResult.value, id: { not: userId } },
      select: { id: true },
    });
    if (taken) {
      throw new ApiError("이미 사용 중인 이메일입니다.", 409, "EMAIL_ALREADY_REGISTERED");
    }

    nextEmail = emailResult.value;
    if (isSignupEmailVerificationEnabled()) {
      nextEmailKind = "UNVERIFIED";
    } else {
      nextEmailKind = "VERIFIED";
      emailVerifiedAt = new Date();
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: nameResult.value,
      phoneNumber: phoneResult.value,
      email: nextEmail,
      emailKind: nextEmailKind,
      ...(emailVerifiedAt ? { emailVerifiedAt } : {}),
    },
    select: {
      name: true,
      phoneNumber: true,
      email: true,
      emailKind: true,
    },
  });

  return toContactSnapshot(updated);
}
