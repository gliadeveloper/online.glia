import { ApiError } from "@/lib/api";
import { createLiveStartedNotification } from "@/lib/home-notifications";
import { prisma } from "@/lib/prisma";

export async function startLiveSession(params: { coachId: string; lessonId: string }) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: { id: true, type: true, module: { select: { course: { select: { id: true, instructorId: true } } } } },
  });
  if (!lesson || lesson.type !== "LIVE" || lesson.module.course.instructorId !== params.coachId) {
    throw new ApiError("라이브 수업을 시작할 권한이 없습니다.", 404, "LIVE_LESSON_NOT_FOUND");
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const liveSession = await tx.liveSession.upsert({
      where: { lessonId: lesson.id },
      update: { status: "LIVE", startedAt: now, endedAt: null },
      create: { lessonId: lesson.id, coachId: params.coachId, status: "LIVE", startedAt: now },
    });
    const enrollments = await tx.enrollment.findMany({
      where: { courseId: lesson.module.course.id, status: "ACTIVE" },
      select: { userId: true },
    });
    await createLiveStartedNotification(tx, {
      liveSessionId: liveSession.id,
      recipientIds: enrollments.map((enrollment) => enrollment.userId),
      occurredAt: now,
    });
    return liveSession;
  });
}

export async function endLiveSession(params: { coachId: string; lessonId: string }) {
  const liveSession = await prisma.liveSession.findFirst({
    where: { lessonId: params.lessonId, coachId: params.coachId },
    select: { id: true },
  });
  if (!liveSession) throw new ApiError("진행 중인 라이브 수업을 찾을 수 없습니다.", 404, "LIVE_SESSION_NOT_FOUND");
  return prisma.liveSession.update({
    where: { id: liveSession.id },
    data: { status: "ENDED", endedAt: new Date() },
  });
}
