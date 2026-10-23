import { prisma } from "@/lib/prisma";
import { getCheckInOverview } from "@/lib/forms";
import { isContactComplete, isPlaceholderEmail } from "@/lib/member-contact";
import { profileAvatarSrc } from "@/lib/profile-avatar";

export async function getMyPageData(userId: string) {
  const [user, enrollmentCount, entitlementCount, checkIns, orderCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailKind: true,
        name: true,
        phoneNumber: true,
        nickname: true,
        role: true,
        password: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            avatarUrl: true,
            headline: true,
            bio: true,
          },
        },
        identities: {
          where: { status: "ACTIVE" },
          select: {
            provider: true,
            providerDisplayName: true,
            linkedAt: true,
          },
          orderBy: { linkedAt: "asc" },
        },
      },
    }),
    prisma.enrollment.count({ where: { userId, status: "ACTIVE" } }),
    prisma.coachingEntitlement.count({ where: { userId, status: "ACTIVE" } }),
    getCheckInOverview(userId),
    prisma.order.count({ where: { userId } }),
  ]);

  if (!user) {
    return null;
  }

  const daily = checkIns.find((item) => item.form.purpose === "DAILY_CHECKIN");
  const weekly = checkIns.find((item) => item.form.purpose === "WEEKLY_CHECKIN");

  const displayEmail = isPlaceholderEmail(user.email, user.emailKind) ? null : user.email;

  const kakaoIdentity = user.identities.find((item) => item.provider === "KAKAO");

  return {
    user,
    displayEmail,
    displayName: user.nickname ?? kakaoIdentity?.providerDisplayName ?? "회원",
    contactComplete: isContactComplete(user),
    avatarUrl: profileAvatarSrc(user.profile?.avatarUrl) || null,
    headline: user.profile?.headline ?? null,
    bio: user.profile?.bio ?? null,
    authMethods: {
      kakao: Boolean(kakaoIdentity),
      email: Boolean(user.password),
    },
    stats: {
      enrollmentCount,
      entitlementCount,
      orderCount,
      dailyCheckInDone: daily?.hasSubmission ?? false,
      weeklyCheckInDone: weekly?.hasSubmission ?? false,
    },
  };
}

export type MyPageData = NonNullable<Awaited<ReturnType<typeof getMyPageData>>>;
