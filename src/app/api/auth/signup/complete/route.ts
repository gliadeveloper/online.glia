import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { attachSessionCookie } from "@/lib/auth-session";
import { ApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  SIGNUP_DRAFT_COOKIE,
  getSignupDraftCookieOptions,
} from "@/lib/signup/constants";
import { assertRateLimit, getClientIp, RateLimitError } from "@/lib/signup/rate-limit";
import {
  completeEmailSignup,
  completeKakaoOnboarding,
  getSignupDraftById,
} from "@/lib/signup/service";
import { validateNickname, validateUserId } from "@/lib/signup/validation";
import { getCurrentUser } from "@/lib/session";

async function getDraftId() {
  const cookieStore = await cookies();
  return cookieStore.get(SIGNUP_DRAFT_COOKIE)?.value ?? null;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    assertRateLimit(`signup:profile:${ip}`, 20);

    const body = (await request.json()) as {
      userId?: string;
      nickname?: string;
      avatarPresetId?: string;
      marketingConsent?: boolean;
    };

    const nicknameResult = validateNickname(body.nickname ?? "");
    if (!nicknameResult.ok) {
      throw new ApiError(nicknameResult.message, 400, "VALIDATION_ERROR");
    }

    const publicUserId = body.userId?.trim().toLowerCase() ?? "";
    const userIdResult = validateUserId(publicUserId);
    if (!userIdResult.ok) {
      throw new ApiError(userIdResult.message, 400, "VALIDATION_ERROR");
    }

    if (!body.avatarPresetId) {
      throw new ApiError("프로필 사진을 선택해 주세요.", 400, "AVATAR_REQUIRED");
    }

    const sessionUser = await getCurrentUser();
    const draftId = await getDraftId();

    if (sessionUser && !draftId) {
      const onboardingState = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { onboardingCompletedAt: true },
      });

      if (!onboardingState?.onboardingCompletedAt) {
        await completeKakaoOnboarding({
          accountId: sessionUser.id,
          publicUserId,
          nickname: body.nickname!.trim(),
          avatarPresetId: body.avatarPresetId,
          marketingConsent: Boolean(body.marketingConsent),
        });

        return NextResponse.json({ ok: true, mode: "kakao" });
      }
    }

    if (!draftId) {
      throw new ApiError("회원가입 세션이 만료되었습니다.", 401, "DRAFT_EXPIRED");
    }

    const draft = await getSignupDraftById(draftId);
    if (!draft?.emailVerifiedAt || !draft.termsAcceptedAt) {
      throw new ApiError("이전 단계를 먼저 완료해 주세요.", 409, "SIGNUP_INCOMPLETE");
    }

    await prisma.signupDraft.update({
      where: { id: draft.id },
      data: {
        userId: publicUserId,
        nickname: body.nickname!.trim(),
        avatarPresetId: body.avatarPresetId,
        marketingConsent: Boolean(body.marketingConsent),
        marketingAcceptedAt: body.marketingConsent ? new Date() : draft.marketingAcceptedAt,
      },
    });

    const created = await completeEmailSignup(draft.id);
    const response = NextResponse.json({ ok: true, mode: "email" });
    await attachSessionCookie(response, created.id, request);
    response.cookies.set(SIGNUP_DRAFT_COOKIE, "", { ...getSignupDraftCookieOptions(0), maxAge: 0 });

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonError(new ApiError(error.message, 429, "RATE_LIMITED"));
    }
    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return jsonError(
        new ApiError("이미 가입된 이메일입니다. 로그인해 주세요.", 409, "EMAIL_ALREADY_REGISTERED"),
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return jsonError(new ApiError("이미 사용 중인 사용자 ID입니다.", 409, "USER_ID_TAKEN"));
    }
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      step?: "terms" | "marketing";
      marketingConsent?: boolean;
    };

    const draftId = await getDraftId();
    const sessionUser = await getCurrentUser();

    if (body.step === "terms") {
      if (draftId) {
        const draft = await getSignupDraftById(draftId);
        if (!draft?.emailVerifiedAt) {
          throw new ApiError("이메일 인증을 먼저 완료해 주세요.", 409, "EMAIL_NOT_VERIFIED");
        }
        await prisma.signupDraft.update({
          where: { id: draftId },
          data: { termsAcceptedAt: new Date() },
        });
        return NextResponse.json({ ok: true });
      }

      if (sessionUser) {
        return NextResponse.json({ ok: true, mode: "kakao" });
      }

      throw new ApiError("회원가입 세션이 만료되었습니다.", 401, "DRAFT_EXPIRED");
    }

    if (body.step === "marketing") {
      const now = new Date();
      if (draftId) {
        await prisma.signupDraft.update({
          where: { id: draftId },
          data: {
            marketingConsent: Boolean(body.marketingConsent),
            marketingAcceptedAt: body.marketingConsent ? now : null,
          },
        });
        return NextResponse.json({ ok: true });
      }

      if (sessionUser) {
        return NextResponse.json({
          ok: true,
          mode: "kakao",
          marketingConsent: Boolean(body.marketingConsent),
        });
      }

      throw new ApiError("회원가입 세션이 만료되었습니다.", 401, "DRAFT_EXPIRED");
    }

    throw new ApiError("잘못된 요청입니다.", 400, "VALIDATION_ERROR");
  } catch (error) {
    return jsonError(error);
  }
}
