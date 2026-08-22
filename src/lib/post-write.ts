export function buildPostSlug(_title: string): string {
  // ASCII-only slugs avoid unicode path decoding issues in some server/proxy stacks.
  return `post-${Date.now().toString(36)}`;
}

export function normalizePostSlugParam(value: string): string {
  let slug = value;

  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep raw value when not URI-encoded
  }

  return slug.normalize("NFKC").trim();
}

export function validatePostTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new Error("TITLE_REQUIRED");
  }

  const trimmed = title.trim();
  if (trimmed.length < 2) {
    throw new Error("TITLE_TOO_SHORT");
  }

  if (trimmed.length > 120) {
    throw new Error("TITLE_TOO_LONG");
  }

  return trimmed;
}

export function validateMarkdownBody(body: unknown, params: { field: "post" }): string {
  if (typeof body !== "string") {
    throw new Error("BODY_REQUIRED");
  }

  const trimmed = body.trim();
  if (trimmed.length < 8) {
    throw new Error("BODY_TOO_SHORT");
  }

  if (trimmed.length > 50_000) {
    throw new Error("BODY_TOO_LONG");
  }

  return trimmed;
}

export function validateCommentBody(body: unknown): string {
  if (typeof body !== "string") {
    throw new Error("BODY_REQUIRED");
  }

  const trimmed = body.trim();
  if (trimmed.length < 1) {
    throw new Error("BODY_TOO_SHORT");
  }

  if (trimmed.length > 2_000) {
    throw new Error("BODY_TOO_LONG");
  }

  return trimmed;
}

export function mapPostWriteError(code: string): string {
  switch (code) {
    case "TITLE_REQUIRED":
    case "TITLE_TOO_SHORT":
      return "제목을 2자 이상 입력해 주세요.";
    case "TITLE_TOO_LONG":
      return "제목은 120자 이내로 입력해 주세요.";
    case "BODY_REQUIRED":
    case "BODY_TOO_SHORT":
      return "내용을 입력해 주세요.";
    case "BODY_TOO_LONG":
      return "내용이 너무 깁니다.";
    case "PARENT_POST_NOT_FOUND":
      return "원본 글을 찾을 수 없습니다.";
    case "PARENT_NOT_ROOT":
      return "인증 글에는 또 다른 인증 글을 작성할 수 없습니다.";
    case "PARENT_COMMENT_NOT_FOUND":
      return "답글 대상 댓글을 찾을 수 없습니다.";
    case "INVALID_REPORT_REASON":
      return "신고 사유를 선택해 주세요.";
    case "INVALID_REPORT_DETAIL":
      return "신고 상세 형식이 올바르지 않습니다.";
    case "REPORT_DETAIL_TOO_LONG":
      return "신고 상세는 500자 이내로 입력해 주세요.";
    case "REPORT_ALREADY_EXISTS":
      return "이미 신고한 콘텐츠입니다.";
    case "REPORT_NOT_FOUND":
      return "신고 내역을 찾을 수 없습니다.";
    case "REPORT_ALREADY_RESOLVED":
      return "이미 처리된 신고입니다.";
    case "POST_NOT_FOUND":
    case "COMMENT_NOT_FOUND":
      return "게시글 또는 댓글을 찾을 수 없습니다.";
    case "FORBIDDEN":
      return "권한이 없습니다.";
    case "UNAUTHORIZED":
      return "로그인이 필요합니다.";
    default:
      return "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}
