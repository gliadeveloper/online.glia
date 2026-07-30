export const coachProfileSelect = {
  id: true,
  name: true,
  email: true,
  profile: { select: { avatarUrl: true } },
} as const;

export type CoachProfile = {
  id: string;
  name: string | null;
  email: string;
  profile: { avatarUrl: string | null } | null;
};

export function displayCoachName(coach: Pick<CoachProfile, "name" | "email">) {
  return coach.name?.trim() || coach.email;
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
