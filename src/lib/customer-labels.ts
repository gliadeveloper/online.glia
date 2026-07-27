import type {
  CoachingEntitlementStatus,
  CoachingSessionStatus,
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
  DROPPED: "중단",
  SUSPENDED: "정지",
};

export const coachingEntitlementLabels: Record<CoachingEntitlementStatus, string> = {
  ACTIVE: "사용 가능",
  EXHAUSTED: "회차 소진",
  EXPIRED: "만료",
  REVOKED: "회수됨",
  SUSPENDED: "정지",
};

export const coachingSessionLabels: Record<CoachingSessionStatus, string> = {
  SCHEDULED: "예약됨",
  CONFIRMED: "확정",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED_BY_USER: "고객 취소",
  CANCELLED_BY_COACH: "코치 취소",
  NO_SHOW: "노쇼",
  RESCHEDULED: "일정 변경",
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

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  DRAFT: "임시 저장",
  SUBMITTED: "제출됨",
  RETURNED: "재제출 요청",
  GRADED: "채점 완료",
};

export function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
