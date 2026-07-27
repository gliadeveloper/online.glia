import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseActions } from "@/app/admin/courses/[id]/course-actions";
import { CourseEditPanel } from "@/app/admin/courses/[id]/course-edit-panel";
import { CourseTaxonomyPanel } from "@/app/admin/courses/[id]/course-taxonomy-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { courseInclude } from "@/lib/courses";
import { courseLevelLabels, courseStatusLabels } from "@/lib/course-labels";
import { prisma } from "@/lib/prisma";
import { listCategories, listTags } from "@/lib/taxonomy-admin";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCourseDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      ...courseInclude,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!course) {
    notFound();
  }

  const [allCategories, allTags] = await Promise.all([listCategories(), listTags()]);

  return (
    <div className="space-y-6">
      <Link href="/admin/courses" className="text-sm font-medium text-violet-600">
        ← 코스 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
          <p className="font-mono text-sm text-zinc-500">{course.slug}</p>
        </div>
        <CourseActions courseId={course.id} status={course.status} />
        <CourseEditPanel
          courseId={course.id}
          title={course.title}
          description={course.description}
          level={course.level}
          thumbnailUrl={course.thumbnailUrl}
          isFeatured={course.isFeatured}
        />
      </div>

      <Link
        href={`/admin/courses/${course.id}/curriculum`}
        className="inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white"
      >
        커리큘럼 편집 →
      </Link>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "상태", value: courseStatusLabels[course.status] },
          { label: "레벨", value: courseLevelLabels[course.level] },
          { label: "모듈", value: String(course._count.modules) },
          { label: "수강생", value: String(course._count.enrollments) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      {course.description && (
        <p className="rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-600 shadow-sm">
          {course.description}
        </p>
      )}

      <CourseTaxonomyPanel
        courseId={course.id}
        categories={allCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
        }))}
        tags={allTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        }))}
        selectedCategoryIds={course.categories.map((item) => item.categoryId)}
        selectedTagIds={course.tags.map((item) => item.tagId)}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold">커리큘럼</h2>
          <p className="text-sm text-zinc-500">
            강사 {course.instructor.name ?? course.instructor.email}
          </p>
        </div>
        <ol className="divide-y divide-zinc-100">
          {course.modules.map((module) => (
            <li key={module.id} className="px-5 py-4">
              <p className="font-medium">{module.title}</p>
              <p className="text-sm text-zinc-500">{module._count.lessons} 레슨</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-2">
        <StatusBadge value={course.status} label={courseStatusLabels[course.status]} />
        {course.isFeatured && <StatusBadge value="PUBLISHED" label="Featured" />}
      </div>
    </div>
  );
}
