export function formatReviewAuthor(user: { nickname: string | null; email: string }) {
  return user.nickname ?? user.email.split("@")[0] ?? "수강생";
}
