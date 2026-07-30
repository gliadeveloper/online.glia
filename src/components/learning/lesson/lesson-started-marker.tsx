"use client";

import { useEffect } from "react";

type LessonStartedMarkerProps = {
  lessonId: string;
  courseSlug: string;
  status: string;
};

export function LessonStartedMarker({ lessonId, courseSlug, status }: LessonStartedMarkerProps) {
  useEffect(() => {
    if (status !== "NOT_STARTED") return;

    void fetch(`/api/lms/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseSlug, status: "IN_PROGRESS" }),
    });
  }, [lessonId, courseSlug, status]);

  return null;
}
