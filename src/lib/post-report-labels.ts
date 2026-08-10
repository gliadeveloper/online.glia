export const postReportReasonValues = ["SPAM", "ABUSE", "INAPPROPRIATE", "OTHER"] as const;

export type PostReportReasonValue = (typeof postReportReasonValues)[number];

export const postReportReasonLabels: Record<PostReportReasonValue, string> = {
  SPAM: "스팸/광고",
  ABUSE: "욕설/괴롭힘",
  INAPPROPRIATE: "부적절한 내용",
  OTHER: "기타",
};

export const postReportStatusLabels = {
  PENDING: "대기",
  REVIEWED: "처리됨",
  DISMISSED: "기각",
} as const;
