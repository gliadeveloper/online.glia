import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { SIGNUP_DRAFT_COOKIE } from "@/lib/signup/constants";
import { verifyVerificationCode } from "@/lib/signup/crypto";
import { assertRateLimit, getClientIp, RateLimitError } from "@/lib/signup/rate-limit";
import { getSignupDraftById } from "@/lib/signup/service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    assertRateLimit(`signup:verify:${ip}`, 20);

    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      throw new ApiError("인증 코드를 입력해 주세요.", 400, "VALIDATION_ERROR");
    }

    const cookieStore = await cookies();
    const draftId = cookieStore.get(SIGNUP_DRAFT_COOKIE)?.value;
    if (!draftId) {
      throw new ApiError("회원가입 세션이 만료되었습니다. 처음부터 다시 시도해 주세요.", 401, "DRAFT_EXPIRED");
    }

    const draft = await getSignupDraftById(draftId);
    if (!draft) {
      throw new ApiError("회원가입 세션이 만료되었습니다. 처음부터 다시 시도해 주세요.", 401, "DRAFT_EXPIRED");
    }

    if (!draft.verifyExpiresAt || draft.verifyExpiresAt.getTime() <= Date.now()) {
      throw new ApiError("인증 코드가 만료되었습니다. 다시 발송해 주세요.", 410, "CODE_EXPIRED");
    }

    const valid = await verifyVerificationCode(draft.verifyCodeHash, code);
    if (!valid) {
      throw new ApiError("인증 코드가 올바르지 않습니다.", 401, "INVALID_CODE");
    }

    await prisma.signupDraft.update({
      where: { id: draft.id },
      data: {
        emailVerifiedAt: new Date(),
        verifyCodeHash: null,
        verifyExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonError(new ApiError(error.message, 429, "RATE_LIMITED"));
    }
    return jsonError(error);
  }
}
