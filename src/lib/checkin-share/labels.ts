import type { CheckInShareGrantStatus } from "@/generated/prisma/client";

export function shareGrantStatusLabel(status: CheckInShareGrantStatus) {
  const labels: Record<CheckInShareGrantStatus, string> = {
    PENDING: "수락 대기",
    GRANTED: "공유 완료",
    DECLINED: "거절됨",
    CANCELLED: "취소됨",
    EXPIRED: "만료됨",
  };
  return labels[status];
}
