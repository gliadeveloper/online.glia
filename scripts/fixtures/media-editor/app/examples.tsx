"use client";
import { useState } from "react";
import { LessonMarkdownEditor } from "@/components/learning/lesson/lesson-markdown-editor";
import { CoachSessionFeedbackPanel } from "@/components/coach/coach-session-feedback-panel";
import { SessionActions } from "@/app/admin/coaching/sessions/[id]/session-actions";

/** Isolated UI fixture: no application layout, authentication, database or R2. */
export function Examples({ mode }: { mode: string }) {
  const [refreshed, setRefreshed] = useState(false);
  const session = { sessionId: "fixture-session", summary: null, bodyMarkdown: "기존 피드백", bodyMetadata: null, publicationStatus: "DRAFT" };
  if (mode === "coach") return <CoachSessionFeedbackPanel {...session} />;
  if (mode === "admin") return <SessionActions {...session} title="테스트 회차" scheduledAt="2026-10-08T10:00:00.000Z" progressStatus="SCHEDULED" />;
  return <>
    <button onClick={() => setRefreshed(true)}>서버 props 갱신</button>
    <LessonMarkdownEditor lessonId="fixture-lesson" courseId="fixture-course" apiRole="coach" contents={refreshed ? [{ id: "saved-content", type: "HTML", body: "서버의 저장본" }] : []} />
  </>;
}
