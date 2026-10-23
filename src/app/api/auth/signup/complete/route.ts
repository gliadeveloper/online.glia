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
  allocatePublicUserId,
  completeEmailSignup,
  completeKakaoOnboarding,
  getSignupDraftById,
} from "@/lib/signup/service";
import { getCurrentUser } from "@/lib/session";

async function getDraftId() {
  const cookieStore = await cookies();
  return cookieStore.get(SIGNUP_DRAFT_COOKIE)?.value ?? null;
}

async function finishSignup(request: Request, marketingConsent: boolean) {
  const now = new Date();
  const draftId = await getDraftId();
  const sessionUser = await getCurrentUser();

  if (draftId) {
    const draft = await getSignupDraftById(draftId);
    if (!draft?.emailVerifiedAt) {
      throw new ApiError("이메일 인증을 먼저 완료해 주세요.", 409, "EMAIL_NOT_VERIFIED");
    }

    const publicUserId = draft.userId || (await allocatePublicUserId());
    await prisma.signupDraft.update({
      where: { id: draft.id },
      data: {
        userId: publicUserId,
        termsAcceptedAt: draft.termsAcceptedAt ?? now,
        marketingConsent,
        marketingAcceptedAt: marketingConsent ? now : null,
      },
    });

    const created = await completeEmailSignup(draft.id);
    const response = NextResponse.json({
      ok: true,
      completed: true,
      mode: "email",
      user: { id: created.id, role: created.role },
    });
    await attachSessionCookie(response, created.id, request);
    response.cookies.set(SIGNUP_DRAFT_COOKIE, "", { ...getSignupDraftCookieOptions(0), maxAge: 0 });
    return response;
  }

  if (sessionUser) {
    const existing = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, role: true, onboardingCompletedAt: true },
    });

    if (existing?.onboardingCompletedAt) {
      return NextResponse.json({
        ok: true,
        completed: true,
        mode: "existing",
        user: { id: existing.id, role: existing.role },
      });
    }

    const user = await completeKakaoOnboarding({
      accountId: sessionUser.id,
      marketingConsent,
    });
    return NextResponse.json({
      ok: true,
      completed: true,
      mode: "kakao",
      user: { id: user.id, role: user.role },
    });
  }

  throw new ApiError("회원가입 세션이 만료되었습니다.", 401, "DRAFT_EXPIRED");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    assertRateLimit(`signup:complete:${ip}`, 20);
    const body = (await request.json().catch(() => ({}))) as { marketingConsent?: boolean };
    return await finishSignup(request, Boolean(body.marketingConsent));
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
      return jsonError(new ApiError("이미 사용 중인 계정입니다.", 409, "USER_ID_TAKEN"));
    }
    if (error instanceof Error && error.message === "SIGNUP_INCOMPLETE") {
      return jsonError(new ApiError("이전 단계를 먼저 완료해 주세요.", 409, "SIGNUP_INCOMPLETE"));
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

    if (body.step !== "terms" && body.step !== "marketing") {
      throw new ApiError("잘못된 요청입니다.", 400, "VALIDATION_ERROR");
    }

    return await finishSignup(request, Boolean(body.marketingConsent));
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return jsonError(
        new ApiError("이미 가입된 이메일입니다. 로그인해 주세요.", 409, "EMAIL_ALREADY_REGISTERED"),
      );
    }
    if (error instanceof Error && error.message === "SIGNUP_INCOMPLETE") {
      return jsonError(new ApiError("이전 단계를 먼저 완료해 주세요.", 409, "SIGNUP_INCOMPLETE"));
    }
    return jsonError(error);
  }
}
