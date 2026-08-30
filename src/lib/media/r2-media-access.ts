import { ApiError } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { prisma } from "@/lib/prisma";

import { parseAvatarMediaObjectKey } from "./avatar-image";
import { parseCoachingMediaObjectKey, parseCourseMediaObjectKey } from "./content-metadata";

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

export async function assertR2MediaAccess(userId: string, objectKey: string) {
  if (parseAvatarMediaObjectKey(objectKey)) {
    return { objectKey };
  }

  const coaching = parseCoachingMediaObjectKey(objectKey);
  if (coaching) {
    return assertCoachingMediaAccess(userId, coaching.sessionId);
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
