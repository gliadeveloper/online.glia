import { ApiError } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { canAccessEnrollment, materializeEnrollmentExpiry } from "@/lib/enrollment-access";
import { prisma } from "@/lib/prisma";

import { parseAvatarMediaObjectKey } from "./avatar-image";
import { parseCommunityMediaObjectKey } from "./community-media";
import { parseCoachingMediaObjectKey, parseCourseMediaObjectKey } from "./content-metadata";
import { parseLessonQnaMediaObjectKey } from "./lesson-qna-media";

async function assertCoachingMediaAccess(userId: string, sessionId: string) {
  const session = await prisma.coachingSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      coachId: true,
      publicationStatus: true,
    },
  });

  if (!session) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError("Login required", 401, "UNAUTHORIZED");
  }

  if (user.role === "ADMIN" || session.coachId === userId) {
    return { sessionId };
  }

  if (session.userId === userId && session.publicationStatus === "PUBLISHED") {
    return { sessionId };
  }

  throw new ApiError("Forbidden", 403, "FORBIDDEN");
}

async function assertLessonQnaMediaAccess(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) {
    throw new ApiError("Login required", 401, "UNAUTHORIZED");
  }

  if (user.role === "ADMIN" || course.instructorId === userId) {
    return { courseId };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  const materialized = await materializeEnrollmentExpiry(enrollment);
  if (!canAccessEnrollment(materialized)) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  return { courseId };
}

export async function assertR2MediaAccess(userId: string, objectKey: string) {
  if (parseAvatarMediaObjectKey(objectKey) || parseCommunityMediaObjectKey(objectKey)) {
    return { objectKey };
  }

  const coaching = parseCoachingMediaObjectKey(objectKey);
  if (coaching) {
    return assertCoachingMediaAccess(userId, coaching.sessionId);
  }

  const lessonQna = parseLessonQnaMediaObjectKey(objectKey);
  if (lessonQna) {
    return assertLessonQnaMediaAccess(userId, lessonQna.courseId);
  }

  const parsed = parseCourseMediaObjectKey(objectKey);
  if (!parsed) {
    throw new ApiError("Invalid media key", 403, "FORBIDDEN");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError("Login required", 401, "UNAUTHORIZED");
  }

  if (user.role === "ADMIN") {
    return parsed;
  }

  if (user.role === "COACH") {
    await assertCoachOwnsLesson(userId, parsed.lessonId);
    return parsed;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: parsed.courseId,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
  });

  if (!enrollment) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  return parsed;
}
