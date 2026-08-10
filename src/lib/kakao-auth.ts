import type { AuthProvider, EmailKind, User } from "@/generated/prisma/client";

import { KakaoAuthError } from "@/lib/kakao-auth-error";
import { prisma } from "@/lib/prisma";

const KAKAO_AUTH_URL = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me";

type KakaoTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
  error_code?: string;
};

type KakaoUserResponse = {
  id: number;
  kakao_account?: {
    email?: string;
    is_email_valid?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  msg?: string;
  code?: number;
};

export function getKakaoConfig() {
  const clientId = process.env.KAKAO_REST_API_KEY?.trim();
  const redirectUri = process.env.KAKAO_REDIRECT_URI?.trim();
  const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim();

  if (!clientId || !redirectUri) {
    return null;
  }

  return { clientId, redirectUri, clientSecret };
}

export function buildKakaoAuthorizeUrl(state: string) {
  const config = getKakaoConfig();
  if (!config) {
    throw new Error("Kakao OAuth is not configured");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });

  return `${KAKAO_AUTH_URL}?${params.toString()}`;
}

export async function exchangeKakaoCode(code: string) {
  const config = getKakaoConfig();
  if (!config) {
    throw new Error("Kakao OAuth is not configured");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as KakaoTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new KakaoAuthError(
      data.error_description ?? data.error ?? "Failed to exchange Kakao token",
      data.error_code ?? data.error,
    );
  }

  return data;
}

export async function fetchKakaoUser(accessToken: string) {
  const propertyKeys = encodeURIComponent(
    JSON.stringify(["kakao_account.profile", "kakao_account.email"]),
  );
  const response = await fetch(`${KAKAO_USER_URL}?property_keys=${propertyKeys}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  const data = (await response.json()) as KakaoUserResponse;
  if (!response.ok || !data.id) {
    throw new KakaoAuthError(
      data.msg ?? "Failed to fetch Kakao user profile",
      data.code != null ? String(data.code) : undefined,
    );
  }

  return data;
}

function normalizeEmail(email: string | undefined, kakaoId: string) {
  const normalized = email?.trim().toLowerCase();
  if (normalized) {
    return { email: normalized, emailKind: "VERIFIED" as EmailKind };
  }

  return {
    email: `kakao_${kakaoId}@oauth.local`,
    emailKind: "PLACEHOLDER" as EmailKind,
  };
}

function getKakaoProfile(data: KakaoUserResponse) {
  const nickname =
    data.kakao_account?.profile?.nickname ??
    data.properties?.nickname ??
    `카카오 사용자 ${data.id}`;
  const avatarUrl =
    data.kakao_account?.profile?.profile_image_url ?? data.properties?.profile_image ?? null;
  const email =
    data.kakao_account?.is_email_valid === false ? undefined : data.kakao_account?.email;

  return { nickname, avatarUrl, email };
}

type UpsertKakaoUserInput = {
  kakaoUser: KakaoUserResponse;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes?: string;
};

export async function upsertUserFromKakao(
  input: UpsertKakaoUserInput,
): Promise<{ user: User; isNewUser: boolean }> {
  const providerAccountId = String(input.kakaoUser.id);
  const profile = getKakaoProfile(input.kakaoUser);
  const emailInfo = normalizeEmail(profile.email, providerAccountId);
  const tokenExpiresAt =
    input.expiresIn != null && Number.isFinite(input.expiresIn)
      ? new Date(Date.now() + input.expiresIn * 1000)
      : null;

  const existingIdentity = await prisma.identity.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "KAKAO",
        providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingIdentity) {
    const user = await prisma.$transaction(async (tx) => {
      await tx.identity.update({
        where: { id: existingIdentity.id },
        data: {
          providerEmail: profile.email ?? existingIdentity.providerEmail,
          providerDisplayName: profile.nickname,
          providerAvatarUrl: profile.avatarUrl,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken ?? existingIdentity.refreshToken,
          tokenExpiresAt,
          scopes: input.scopes ?? existingIdentity.scopes,
          status: "ACTIVE",
          revokedAt: null,
          lastAuthenticatedAt: new Date(),
        },
      });

      const user = await tx.user.update({
        where: { id: existingIdentity.userId },
        data: {
          name: profile.nickname,
          lastLoginAt: new Date(),
          ...(profile.email && existingIdentity.user.emailKind === "PLACEHOLDER"
            ? {
                email: profile.email,
                emailKind: "VERIFIED",
                emailVerifiedAt: new Date(),
              }
            : {}),
        },
      });

      await tx.profile.upsert({
        where: { userId: user.id },
        update: {
          avatarUrl: profile.avatarUrl ?? undefined,
        },
        create: {
          userId: user.id,
          avatarUrl: profile.avatarUrl,
        },
      });

      return user;
    });
    return { user, isNewUser: false };
  }

  const linkedUser = profile.email
    ? await prisma.user.findUnique({ where: { email: profile.email } })
    : null;

  if (linkedUser) {
    const user = await prisma.$transaction(async (tx) => {
      await tx.identity.create({
        data: {
          userId: linkedUser.id,
          provider: "KAKAO" satisfies AuthProvider,
          providerAccountId,
          providerEmail: profile.email,
          providerDisplayName: profile.nickname,
          providerAvatarUrl: profile.avatarUrl,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          tokenExpiresAt,
          scopes: input.scopes,
          lastAuthenticatedAt: new Date(),
        },
      });

      const user = await tx.user.update({
        where: { id: linkedUser.id },
        data: {
          name: linkedUser.name ?? profile.nickname,
          emailKind: linkedUser.emailKind === "PLACEHOLDER" ? "VERIFIED" : linkedUser.emailKind,
          emailVerifiedAt: linkedUser.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });

      await tx.profile.upsert({
        where: { userId: user.id },
        update: { avatarUrl: profile.avatarUrl ?? undefined },
        create: { userId: user.id, avatarUrl: profile.avatarUrl },
      });

      return user;
    });
    return { user, isNewUser: false };
  }

  const user = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        email: emailInfo.email,
        emailKind: emailInfo.emailKind,
        emailVerifiedAt: emailInfo.emailKind === "VERIFIED" ? new Date() : null,
        name: null,
        role: "USER",
        status: "ACTIVE",
        onboardingCompletedAt: null,
        lastLoginAt: new Date(),
        identities: {
          create: {
            provider: "KAKAO",
            providerAccountId,
            providerEmail: profile.email,
            providerDisplayName: profile.nickname,
            providerAvatarUrl: profile.avatarUrl,
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
            tokenExpiresAt,
            scopes: input.scopes,
            lastAuthenticatedAt: new Date(),
          },
        },
      },
    });
  });

  return { user, isNewUser: true };
}
