const SLUG_MAX_BASE = 48;

export function buildPostSlug(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_BASE);

  const base = normalized || "post";
  const suffix = Date.now().toString(36);

  return `${base}-${suffix}`;
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
      return "부모 글을 찾을 수 없습니다.";
    case "UNAUTHORIZED":
      return "로그인이 필요합니다.";
    default:
      return "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}
