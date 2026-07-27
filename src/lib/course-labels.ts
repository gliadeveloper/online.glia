import type { CourseLevel, CourseStatus } from "@/generated/prisma/client";

export const courseLevelLabels: Record<CourseLevel, string> = {
  BEGINNER: "입문",
  INTERMEDIATE: "중급",
  ADVANCED: "고급",
  ALL_LEVELS: "전체",
};

export const courseStatusLabels: Record<CourseStatus, string> = {
  DRAFT: "초안",
  PUBLISHED: "발행됨",
  ARCHIVED: "보관됨",
};
