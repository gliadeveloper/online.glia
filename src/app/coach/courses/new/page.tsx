import Link from "next/link";

import { CoachCreateCourseForm } from "@/components/coach/coach-course-panels";

export default function CoachNewCoursePage() {
  return (
    <div className="space-y-6">
      <Link href="/coach/courses" className="text-sm font-medium text-emerald-700">
        ← 내 코스
      </Link>
      <CoachCreateCourseForm />
    </div>
  );
}
