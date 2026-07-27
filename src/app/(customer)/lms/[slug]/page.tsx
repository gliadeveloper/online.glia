import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressPill } from "@/components/customer/progress-pill";
import { getCurrentUser } from "@/lib/session";
import { getEnrollmentForCourse } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import type { ProgressStatus } from "@/generated/prisma/client";

const lessonTypeIcons: Record<string, string> = {
  VIDEO: "▶",
  TEXT: "📄",
  QUIZ: "✓",
  ASSIGNMENT: "📝",
};

export default async function LmsCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { slug } = await params;

  const enrollment = await getEnrollmentForCourse(user.id, slug);
  if (!enrollment) {
    notFound();
  }

  const course = await prisma.course.findUnique({
    where: { id: enrollment.courseId },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              quiz: { select: { id: true } },
              assignment: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const progressMap = new Map(
    enrollment.progress.map((item) => [item.lessonId, item.status as ProgressStatus]),
  );

  const completedCount = enrollment.progress.filter((p) => p.status === "COMPLETED").length;
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link href="/lms" className="text-sm font-medium text-violet-600">
          ← 내 학습
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{course.title}</h1>
        <p className="mt-2 max-w-3xl text-zinc-600">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {course.categories.map(({ category }) => (
            <span
              key={category.id}
              className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
            >
              {category.name}
            </span>
          ))}
          {course.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600"
            >
              #{tag.name}
            </span>
          ))}
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm text-zinc-500">
            <span>전체 진도</span>
            <span>
              {completedCount}/{totalLessons} · {Math.round(enrollment.progressPercent)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-violet-600"
              style={{ width: `${enrollment.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <section
            key={module.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="text-xs text-zinc-500">Module {module.order}</p>
              <h2 className="font-semibold">{module.title}</h2>
              {module.description && (
                <p className="mt-1 text-sm text-zinc-600">{module.description}</p>
              )}
            </div>
            <ul className="divide-y divide-zinc-100">
              {module.lessons.map((lesson) => {
                const status = progressMap.get(lesson.id) ?? "NOT_STARTED";

                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/lms/${slug}/lessons/${lesson.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-violet-50/50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-lg">{lessonTypeIcons[lesson.type] ?? "•"}</span>
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {lesson.type}
                            {lesson.duration ? ` · ${lesson.duration}분` : ""}
                            {lesson.isFree ? " · 무료 미리보기" : ""}
                          </p>
                        </div>
                      </div>
                      <ProgressPill status={status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
