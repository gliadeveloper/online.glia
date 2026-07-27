import Link from "next/link";

import { ProgressPill } from "@/components/customer/progress-pill";
import { enrollmentStatusLabels } from "@/lib/customer-labels";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { ProgressStatus } from "@/generated/prisma/client";

export default async function LmsPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { purchased } = await searchParams;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          level: true,
          categories: { include: { category: { select: { name: true } } } },
          modules: {
            orderBy: { order: "asc" },
            include: { _count: { select: { lessons: true } } },
          },
        },
      },
      progress: { select: { lessonId: true, status: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">내 학습</h1>
        <p className="text-zinc-600">수강 중인 강의와 학습 진도를 확인하세요.</p>
      </header>

      {purchased === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          구매가 완료되었습니다. 첫 레슨부터 학습을 시작해 보세요.
        </div>
      )}

      {enrollments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-600">아직 수강 중인 강의가 없습니다.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            상품 보러 가기
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {enrollments.map((enrollment) => {
            const totalLessons = enrollment.course.modules.reduce(
              (sum, module) => sum + module._count.lessons,
              0,
            );
            const completedLessons = enrollment.progress.filter(
              (item) => item.status === "COMPLETED",
            ).length;
            const category = enrollment.course.categories[0]?.category.name;

            return (
              <li key={enrollment.id}>
                <Link
                  href={`/lms/${enrollment.course.slug}`}
                  className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md"
                >
                  <div className="aspect-[16/7] bg-gradient-to-br from-violet-100 to-zinc-100">
                    {enrollment.course.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={enrollment.course.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-medium text-violet-700">
                        {enrollment.course.title}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {category && (
                          <p className="text-xs font-medium text-violet-600">{category}</p>
                        )}
                        <h2 className="mt-1 text-lg font-semibold">{enrollment.course.title}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                          {enrollment.course.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium">
                        {enrollmentStatusLabels[enrollment.status]}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-sm text-zinc-500">
                        <span>진도</span>
                        <span>
                          {completedLessons}/{totalLessons} · {Math.round(enrollment.progressPercent)}%
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
