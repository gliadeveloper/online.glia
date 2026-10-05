import type { Metadata } from "next";

import { CoachShell } from "@/components/coach/coach-shell";
import { requireCoach } from "@/lib/coach";
import { countCoachPendingReplies } from "@/lib/coaching-coach";
import { countCoachUnansweredLessonQuestions } from "@/lib/lesson-qna";
import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = privateSectionMetadata;

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCoach();
  const [pendingQnaCount, pendingLessonQnaCount] = await Promise.all([
    countCoachPendingReplies(user.id),
    countCoachUnansweredLessonQuestions(user.id),
  ]);

  return (
    <CoachShell
      userName={user.name ?? "Coach"}
      userEmail={user.email}
      pendingQnaCount={pendingQnaCount}
      pendingLessonQnaCount={pendingLessonQnaCount}
    >
      {children}
    </CoachShell>
  );
}
