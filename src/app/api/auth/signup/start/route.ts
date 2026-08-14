import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import {
  SIGNUP_DRAFT_COOKIE,
  getSignupDraftCookieOptions,
  SIGNUP_DRAFT_TTL_SECONDS,
} from "@/lib/signup/constants";
import { assertRateLimit, getClientIp, RateLimitError } from "@/lib/signup/rate-limit";
import {
  createSignupDraft,
  findExistingAccountSummary,
  markSignupDraftEmailVerified,
  sendSignupVerificationEmail,
} from "@/lib/signup/service";
import { isSignupEmailVerificationEnabled } from "@/lib/signup/constants";
import { maskDisplayName, maskEmail, validatePassword } from "@/lib/signup/validation";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    assertRateLimit(`signup:start:${ip}`);

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      passwordConfirm?: string;
      forceDraft?: boolean;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const passwordConfirm = body.passwordConfirm ?? "";

    if (!email) {
      throw new ApiError("이메일을 입력해 주세요.", 400, "VALIDATION_ERROR");
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      throw new ApiError(passwordResult.message, 400, "VALIDATION_ERROR");
    }

    if (password !== passwordConfirm) {
      throw new ApiError("비밀번호가 일치하지 않습니다.", 400, "PASSWORD_MISMATCH");
    }

    assertRateLimit(`signup:email:${email}`, 5);

    const existing = await findExistingAccountSummary(email);
    if (existing && !body.forceDraft) {
      return NextResponse.json({
        duplicate: true,
        account: {
          email: maskEmail(existing.email),
          maskedName: maskDisplayName(existing.name),
          createdAt: existing.createdAt.toISOString(),
        },
      });
    }

    const { draft, code } = await createSignupDraft({
      email,
      password,
      ipAddress: ip,
    });

    await sendSignupVerificationEmail(email, code);

    const skipEmailVerification = !isSignupEmailVerificationEnabled();
    if (skipEmailVerification) {
      await markSignupDraftEmailVerified(draft.id);
    }

    const response = NextResponse.json({
      duplicate: false,
      ok: true,
      skipEmailVerification,
    });
    response.cookies.set(
      SIGNUP_DRAFT_COOKIE,
      draft.id,
      getSignupDraftCookieOptions(SIGNUP_DRAFT_TTL_SECONDS),
    );

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonError(new ApiError(error.message, 429, "RATE_LIMITED"));
    }
    return jsonError(error);
  }
}
