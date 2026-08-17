import { prisma } from "@/lib/prisma";
import { getLessonZoomUrl } from "@/lib/media/zoom";

export type CoachLiveLessonItem = {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  zoomUrl: string | null;
  liveStatus: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED" | null;
  editHref: string;
};

export async function listCoachLiveLessons(coachId: string): Promise<CoachLiveLessonItem[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      type: "LIVE",
      module: { course: { instructorId: coachId } },
    },
    include: {
      contents: { orderBy: { order: "asc" } },
      liveSession: { select: { status: true } },
      module: {
        include: {
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
    orderBy: [{ module: { course: { title: "asc" } } }, { order: "asc" }],
  });

  return lessons.map((lesson) => ({
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: lesson.module.course.id,
    courseTitle: lesson.module.course.title,
    courseSlug: lesson.module.course.slug,
    zoomUrl: getLessonZoomUrl(lesson.contents),
    liveStatus: lesson.liveSession?.status ?? null,
    editHref: `/coach/lessons/${lesson.id}`,
  }));
}
