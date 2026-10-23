export type PostAuthor = {
  id: string;
  nickname: string | null;
  email: string;
  profile: { headline: string | null; avatarUrl: string | null } | null;
};

export type PostCommentItem = {
  id: string;
  bodyMarkdown: string;
  likeCount: number;
  createdAt: Date;
  editedAt: Date | null;
  user: PostAuthor;
  replies?: PostCommentItem[];
};

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  likeCount: number;
  commentCount: number;
  childPostCount: number;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  user: PostAuthor;
  coverImageUrl?: string | null;
};

export function displayAuthorName(user: {
  nickname: string | null;
  email: string;
}): string {
  return user.nickname ?? user.email.split("@")[0] ?? "익명";
}
