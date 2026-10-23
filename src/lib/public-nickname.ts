import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { validateNickname } from "@/lib/signup/validation";

export async function userHasPublicNickname(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nickname: true },
  });
  return Boolean(user?.nickname?.trim());
}

export async function assertPublicNickname(userId: string) {
  if (await userHasPublicNickname(userId)) {
    return;
  }

  throw new ApiError(
    "글과 댓글에 보일 닉네임을 먼저 정해 주세요.",
    409,
    "NICKNAME_REQUIRED",
  );
}

export async function setPublicNickname(userId: string, nickname: string) {
  const result = validateNickname(nickname);
  if (!result.ok) {
    throw new ApiError(result.message, 400, "VALIDATION_ERROR");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { nickname: nickname.trim() },
    select: { nickname: true },
  });
}

export async function ensurePublicNickname(userId: string, nickname?: string | null) {
  if (await userHasPublicNickname(userId)) {
    return;
  }

  if (nickname?.trim()) {
    await setPublicNickname(userId, nickname);
    return;
  }

  await assertPublicNickname(userId);
}
