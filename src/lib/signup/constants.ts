export const SIGNUP_DRAFT_COOKIE = "glia_signup_draft";

export function getSignupDraftCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export const SIGNUP_DRAFT_TTL_SECONDS = 60 * 60 * 2;

export const AVATAR_PRESETS = [
  { id: "preset-01", label: "프리셋 1", color: "#111111" },
  { id: "preset-02", label: "프리셋 2", color: "#333333" },
  { id: "preset-03", label: "프리셋 3", color: "#555555" },
  { id: "preset-04", label: "프리셋 4", color: "#777777" },
  { id: "preset-05", label: "프리셋 5", color: "#999999" },
  { id: "preset-06", label: "프리셋 6", color: "#222222" },
  { id: "preset-07", label: "프리셋 7", color: "#444444" },
  { id: "preset-08", label: "프리셋 8", color: "#666666" },
  { id: "preset-09", label: "프리셋 9", color: "#888888" },
  { id: "preset-10", label: "프리셋 10", color: "#AAAAAA" },
  { id: "preset-11", label: "프리셋 11", color: "#1A1A1A" },
  { id: "preset-12", label: "프리셋 12", color: "#0A0A0A" },
] as const;

export function getAvatarPresetUrl(presetId: string) {
  const preset = AVATAR_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${preset.color}"/><circle cx="32" cy="26" r="12" fill="#FFFFFF"/><rect x="14" y="42" width="36" height="16" rx="8" fill="#FFFFFF"/></svg>`,
  )}`;
}

export function getSignupStepPath(step: "terms" | "marketing" | "profile") {
  return `/signup/${step}`;
}

export function needsOnboarding(onboardingCompletedAt: Date | null | undefined) {
  return !onboardingCompletedAt;
}

/** Set SIGNUP_EMAIL_VERIFICATION_ENABLED=true when transactional email is ready. */
export function isSignupEmailVerificationEnabled() {
  return process.env.SIGNUP_EMAIL_VERIFICATION_ENABLED === "true";
}
