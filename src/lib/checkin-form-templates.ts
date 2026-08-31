import type { FormQuestionType } from "@/generated/prisma/client";

export const CHECKIN_FORM_SLUGS = {
  daily: "daily-checkin",
  weekly: "weekly-checkin",
} as const;

export type CheckInFormKind = keyof typeof CHECKIN_FORM_SLUGS;

type TemplateOption = {
  label: string;
  value?: string;
  emoji?: string;
  order: number;
};

type TemplateQuestion = {
  prompt: string;
  type: FormQuestionType;
  order: number;
  isRequired?: boolean;
  options: TemplateOption[];
};

export type CheckInFormTemplate = {
  slug: string;
  title: string;
  description: string;
  purpose: "DAILY_CHECKIN" | "WEEKLY_CHECKIN";
  schedule: "DAILY" | "WEEKLY";
  questions: TemplateQuestion[];
};

const moodOptions: TemplateOption[] = [
  { label: "매우 나쁨", emoji: "😖", order: 1 },
  { label: "나쁨", emoji: "😕", order: 2 },
  { label: "보통", emoji: "😐", order: 3 },
  { label: "좋음", emoji: "🙂", order: 4 },
  { label: "매우 좋음", emoji: "😌", order: 5 },
];

export const CHECKIN_FORM_TEMPLATES: Record<CheckInFormKind, CheckInFormTemplate> = {
  daily: {
    slug: CHECKIN_FORM_SLUGS.daily,
    title: "오늘의 체크인",
    description: "매일 아침 상태를 기록하는 데일리 체크인",
    purpose: "DAILY_CHECKIN",
    schedule: "DAILY",
    questions: [
      {
        prompt: "Q1. 지금 내 신경계 상태는?",
        type: "SINGLE_CHOICE",
        order: 1,
        options: moodOptions,
      },
      {
        prompt: "Q2. 지난밤 수면은 어땠나요?",
        type: "SINGLE_CHOICE",
        order: 2,
        options: moodOptions,
      },
      {
        prompt: "Q3. 어젯밤, 밤 10시~새벽 2시 사이에 잠들어 있었나요?",
        type: "YES_NO",
        order: 3,
        options: [
          { label: "예", value: "yes", order: 1 },
          { label: "아니오", value: "no", order: 2 },
        ],
      },
      {
        prompt: "Q4. 지난 밤 디지털 기기 사용의 마지막 시간은?",
        type: "SINGLE_CHOICE",
        order: 4,
        options: [
          { label: "밤 9시 이전까지", value: "before_21", order: 1 },
          { label: "밤 10시 이전까지", value: "before_22", order: 2 },
          { label: "밤 11시 이전까지", value: "before_23", order: 3 },
          { label: "밤 12시 이전까지", value: "before_24", order: 4 },
          { label: "밤 12시 ~ 새벽 2시 사이", value: "between_00_02", order: 5 },
          { label: "새벽 2시 이후", value: "after_02", order: 6 },
        ],
      },
      {
        prompt: "Q5. 어제의 개별 과제는 적용하셨나요?",
        type: "SINGLE_CHOICE",
        order: 5,
        options: [
          { label: "했어요", value: "done", order: 1 },
          { label: "조금 했어요", value: "partial", order: 2 },
          { label: "못 했어요", value: "none", order: 3 },
        ],
      },
      {
        prompt: "한 줄 메모 남기기 (선택)",
        type: "SHORT_TEXT",
        order: 6,
        isRequired: false,
        options: [],
      },
    ],
  },
  weekly: {
    slug: CHECKIN_FORM_SLUGS.weekly,
    title: "주간 체크인",
    description: "매주 일요일, 한 주를 돌아보는 주간 체크인",
    purpose: "WEEKLY_CHECKIN",
    schedule: "WEEKLY",
    questions: [
      {
        prompt: "Q1. 이번 주 전반적인 컨디션은?",
        type: "SINGLE_CHOICE",
        order: 1,
        options: moodOptions,
      },
      {
        prompt: "Q2. 이번 주 수면·호흡·움직임 실천은?",
        type: "SINGLE_CHOICE",
        order: 2,
        options: [
          { label: "대부분 지켰어요", value: "mostly", order: 1 },
          { label: "절반 정도", value: "half", order: 2 },
          { label: "거의 못했어요", value: "rarely", order: 3 },
        ],
      },
      {
        prompt: "Q3. 이번 주 스트레스 수준은?",
        type: "SINGLE_CHOICE",
        order: 3,
        options: [
          { label: "매우 높음", emoji: "😰", order: 1 },
          { label: "높음", emoji: "😟", order: 2 },
          { label: "보통", emoji: "😐", order: 3 },
          { label: "낮음", emoji: "🙂", order: 4 },
          { label: "매우 낮음", emoji: "😌", order: 5 },
        ],
      },
      {
        prompt: "Q4. 이번 주 가장 잘 지킨 습관은?",
        type: "SHORT_TEXT",
        order: 4,
        options: [],
      },
      {
        prompt: "Q5. 다음 주에 개선하고 싶은 점은?",
        type: "SHORT_TEXT",
        order: 5,
        options: [],
      },
      {
        prompt: "Q6. 이번 주 목표 달성도는?",
        type: "SINGLE_CHOICE",
        order: 6,
        options: [
          { label: "100% 달성", value: "100", order: 1 },
          { label: "70% 이상", value: "70", order: 2 },
          { label: "50% 정도", value: "50", order: 3 },
          { label: "50% 미만", value: "below50", order: 4 },
        ],
      },
    ],
  },
};
