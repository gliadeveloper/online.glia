export const coachProfileSelect = {
  id: true,
  nickname: true,
  email: true,
  profile: { select: { avatarUrl: true } },
} as const;

export type CoachProfile = {
  id: string;
  nickname: string | null;
  email: string;
  profile: { avatarUrl: string | null } | null;
};

export function displayCoachName(coach: Pick<CoachProfile, "nickname" | "email">) {
  return coach.nickname?.trim() || coach.email;
}

export function resolveEntitlementCoach<
  T extends {
    coachingOffering: { coach: CoachProfile | null };
    sessions: { coach: CoachProfile }[];
  },
>(entitlement: T): CoachProfile | null {
  return entitlement.sessions[0]?.coach ?? entitlement.coachingOffering.coach ?? null;
}

export function formatCoachingExpiry(validUntil: Date) {
  return validUntil.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export function formatCoachingProgress(completedSessions: number, totalSessions: number) {
  return `${completedSessions}/${totalSessions}회차`;
}
