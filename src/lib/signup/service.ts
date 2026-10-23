import { prisma } from "@/lib/prisma";
import { editableAvatarUrl } from "@/lib/profile-avatar";
import {
  generatePublicUserIdCandidate,
  generateVerificationCode,
  hashPassword,
  hashVerificationCode,
} from "@/lib/signup/crypto";
import {
  SIGNUP_DRAFT_TTL_SECONDS,
  isSignupEmailVerificationEnabled,
} from "@/lib/signup/constants";

export async function findExistingAccountSummary(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      nickname: true,
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
  if (!isSignupEmailVerificationEnabled()) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[signup] verification code for ${email}: ${code}`);
  }
  // Production: integrate email provider (Resend, SES, etc.)
}

export async function markSignupDraftEmailVerified(draftId: string) {
  await prisma.signupDraft.update({
    where: { id: draftId },
    data: {
      emailVerifiedAt: new Date(),
      verifyCodeHash: null,
      verifyExpiresAt: null,
    },
  });
}

export async function allocatePublicUserId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generatePublicUserIdCandidate();
    const [user, draft] = await Promise.all([
      prisma.user.findUnique({ where: { userId: candidate }, select: { id: true } }),
      prisma.signupDraft.findFirst({ where: { userId: candidate }, select: { id: true } }),
    ]);
    if (!user && !draft) {
      return candidate;
    }
  }

  throw new Error("USER_ID_ALLOCATION_FAILED");
}

export async function completeEmailSignup(draftId: string) {
  const draft = await getSignupDraftById(draftId);
  if (!draft?.emailVerifiedAt || !draft.termsAcceptedAt) {
    throw new Error("SIGNUP_INCOMPLETE");
  }

  const publicUserId = draft.userId || (await allocatePublicUserId());
  const avatarUrl = editableAvatarUrl(draft.avatarUrl) || null;

  const termsAcceptedAt = draft.termsAcceptedAt;

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: draft.email } });
    if (existing) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    const created = await tx.user.create({
      data: {
        userId: publicUserId,
        email: draft.email,
        emailKind: "VERIFIED",
        emailVerifiedAt: draft.emailVerifiedAt,
        password: draft.passwordHash,
        nickname: draft.nickname?.trim() || null,
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
  accountId: string;
  publicUserId?: string | null;
  avatarUrl?: string | null;
  marketingConsent: boolean;
}) {
  const existing = await prisma.user.findUnique({
    where: { id: input.accountId },
    select: { userId: true, profile: { select: { avatarUrl: true } } },
  });
  if (!existing) {
    throw new Error("USER_NOT_FOUND");
  }

  const publicUserId = existing.userId ?? input.publicUserId ?? (await allocatePublicUserId());
  const avatarUrl = editableAvatarUrl(input.avatarUrl) || editableAvatarUrl(existing.profile?.avatarUrl) || null;

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.accountId },
      data: {
        userId: publicUserId,
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
            update: avatarUrl ? { avatarUrl } : {},
          },
        },
      },
    });

    return user;
  });
}
