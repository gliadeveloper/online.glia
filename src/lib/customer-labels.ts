import type {
  CoachingEntitlementStatus,
  CoachingSessionPublicationStatus,
  CoachingSessionProgressStatus,
  EnrollmentStatus,
  OrderStatus,
  ProductKind,
  ProgressStatus,
  SubmissionStatus,
} from "@/generated/prisma/client";

export const progressStatusLabels: Record<ProgressStatus, string> = {
  NOT_STARTED: "시작 전",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
};

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  ACTIVE: "수강 중",
  COMPLETED: "수료",
  EXPIRED: "기간 만료",
  DROPPED: "중단",
  SUSPENDED: "정지",
};

export const coachingEntitlementLabels: Record<CoachingEntitlementStatus, string> = {
  ACTIVE: "사용 가능",
  COMPLETED: "회차 완료",
  EXPIRED: "만료",
  REVOKED: "회수됨",
  SUSPENDED: "정지",
};

export const coachingPublicationLabels: Record<CoachingSessionPublicationStatus, string> = {
  EMPTY: "미등록",
  DRAFT: "작성 중",
  PUBLISHED: "오픈",
};

export const coachingSessionProgressLabels: Record<CoachingSessionProgressStatus, string> = {
  NOT_STARTED: "시작 전",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "결제 대기",
  PAID: "결제 완료",
  PARTIALLY_REFUNDED: "부분 환불",
  REFUNDED: "환불됨",
  CANCELLED: "취소됨",
};

export const productKindLabels: Record<ProductKind, string> = {
  COURSE_ONLY: "VOD 단품",
  COACHING_ONLY: "코칭 단품",
  BUNDLE: "번들",
};

export function getProductDisplayPrice(product: {
  listPrice: number;
  salePrice: number | null;
}) {
  return product.salePrice ?? product.listPrice;
}

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  DRAFT: "임시 저장",
  SUBMITTED: "제출됨",
  RETURNED: "재제출 요청",
  GRADED: "채점 완료",
};

export function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
