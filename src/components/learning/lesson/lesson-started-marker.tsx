"use client";

import { useEffect } from "react";

type LessonStartedMarkerProps = {
  lessonId: string;
  courseId: string;
  status: string;
};

export function LessonStartedMarker({ lessonId, courseId, status }: LessonStartedMarkerProps) {
  useEffect(() => {
    if (status !== "NOT_STARTED") return;

    void fetch(`/api/lms/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, status: "IN_PROGRESS" }),
    });
  }, [lessonId, courseId, status]);

  return null;
}
