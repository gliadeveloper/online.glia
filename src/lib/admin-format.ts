export const purposeLabels: Record<string, string> = {
  DAILY_CHECKIN: "데일리 체크인",
  WEEKLY_CHECKIN: "주간 체크인",
  SURVEY: "설문",
  INTAKE: "인테이크",
};

export const scheduleLabels: Record<string, string> = {
  ONCE: "1회",
  DAILY: "매일",
  WEEKLY: "매주",
};

export const statusLabels: Record<string, string> = {
  DRAFT: "초안",
  PUBLISHED: "발행됨",
  ARCHIVED: "보관됨",
};

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
