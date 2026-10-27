import "server-only";

import { ApiError } from "@/lib/api";
import {
  isPlaceholderEmail,
  toContactSnapshot,
  validateContactEmail,
  validateLegalName,
  validatePhoneNumber,
} from "@/lib/member-contact";
import { prisma } from "@/lib/prisma";
import { isSignupEmailVerificationEnabled } from "@/lib/signup/constants";

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
