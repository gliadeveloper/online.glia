export function formatReviewAuthor(user: { name: string | null; email: string }) {
  return user.name ?? user.email.split("@")[0] ?? "수강생";
}
