export function formatReviewAuthor(user: { nickname: string | null; email?: string | null }) {
  return user.nickname?.trim() || "회원";
}
