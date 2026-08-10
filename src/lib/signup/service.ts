import { prisma } from "@/lib/prisma";
import {
  generateVerificationCode,
  hashPassword,
  hashVerificationCode,
} from "@/lib/signup/crypto";
import {
  SIGNUP_DRAFT_TTL_SECONDS,
  getAvatarPresetUrl,
} from "@/lib/signup/constants";

export async function findExistingAccountSummary(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function createSignupDraft(input: {
  email: string;
  password: string;
  ipAddress?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + SIGNUP_DRAFT_TTL_SECONDS * 1000);

  await prisma.signupDraft.deleteMany({ where: { email } });

  const draft = await prisma.signupDraft.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      verifyCodeHash: await hashVerificationCode(code),
      verifyExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      expiresAt,
      ipAddress: input.ipAddress ?? null,
    },
  });

  return { draft, code };
}

export async function getSignupDraftById(id: string) {
  const draft = await prisma.signupDraft.findUnique({ where: { id } });
  if (!draft) return null;
  if (draft.expiresAt.getTime() <= Date.now()) {
    await prisma.signupDraft.delete({ where: { id } });
    return null;
  }
  return draft;
}

export async function sendSignupVerificationEmail(email: string, code: string) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[signup] verification code for ${email}: ${code}`);
  }
  // Production: integrate email provider (Resend, SES, etc.)
}

export async function completeEmailSignup(draftId: string) {
  const draft = await getSignupDraftById(draftId);
  if (!draft?.emailVerifiedAt || !draft.termsAcceptedAt || !draft.nickname) {
    throw new Error("SIGNUP_INCOMPLETE");
  }
  if (!draft.avatarPresetId && !draft.avatarUrl) {
    throw new Error("AVATAR_REQUIRED");
  }

  const avatarUrl =
    draft.avatarUrl ??
    (draft.avatarPresetId ? getAvatarPresetUrl(draft.avatarPresetId) : null);

  const termsAcceptedAt = draft.termsAcceptedAt;

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: draft.email } });
    if (existing) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    const created = await tx.user.create({
      data: {
        email: draft.email,
        emailKind: "VERIFIED",
        emailVerifiedAt: draft.emailVerifiedAt,
        password: draft.passwordHash,
        name: draft.nickname,
        role: "USER",
        status: "ACTIVE",
        onboardingCompletedAt: new Date(),
        lastLoginAt: new Date(),
        profile: {
          create: {
            avatarUrl,
          },
        },
        consent: {
          create: {
            termsAcceptedAt,
            privacyAcceptedAt: termsAcceptedAt,
            age14ConfirmedAt: termsAcceptedAt,
            marketingAcceptedAt: draft.marketingConsent ? draft.marketingAcceptedAt : null,
          },
        },
      },
    });

    await tx.signupDraft.delete({ where: { id: draft.id } });
    return created;
  });

  return user;
}

export async function completeKakaoOnboarding(input: {
  userId: string;
  nickname: string;
  avatarPresetId?: string | null;
  avatarUrl?: string | null;
  marketingConsent: boolean;
}) {
  const avatarUrl =
    input.avatarUrl ??
    (input.avatarPresetId ? getAvatarPresetUrl(input.avatarPresetId) : null);

  if (!avatarUrl) {
    throw new Error("AVATAR_REQUIRED");
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        name: input.nickname,
        onboardingCompletedAt: now,
        lastLoginAt: now,
        consent: {
          upsert: {
            create: {
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
              age14ConfirmedAt: now,
              marketingAcceptedAt: input.marketingConsent ? now : null,
            },
            update: {
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
              age14ConfirmedAt: now,
              marketingAcceptedAt: input.marketingConsent ? now : null,
            },
          },
        },
        profile: {
          upsert: {
            create: { avatarUrl },
            update: { avatarUrl },
          },
        },
      },
    });

    return user;
  });
}
