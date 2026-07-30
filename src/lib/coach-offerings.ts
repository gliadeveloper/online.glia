import { ApiError } from "@/lib/api";
import {
  coachingOfferingInclude,
  createCoachingOffering,
  updateCoachingOffering,
} from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

export { coachingOfferingInclude };

export async function listCoachOfferings(coachId: string) {
  return prisma.coachingOffering.findMany({
    where: { coachId },
    include: coachingOfferingInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function assertCoachOwnsOffering(coachId: string, offeringId: string) {
  const offering = await prisma.coachingOffering.findUnique({
    where: { id: offeringId },
    include: coachingOfferingInclude,
  });

  if (!offering) {
    throw new ApiError("Coaching offering not found", 404, "OFFERING_NOT_FOUND");
  }

  if (offering.coachId !== coachId) {
    throw new ApiError("Offering access denied", 403, "FORBIDDEN");
  }

  return offering;
}

export async function createCoachOffering(params: {
  coachId: string;
  title: string;
  slug: string;
  description?: string;
  totalSessions: number;
  validDays: number;
  courseId?: string;
  isActive?: boolean;
  sessionTitles?: string[];
}) {
  if (params.courseId) {
    const course = await prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course || course.instructorId !== params.coachId) {
      throw new ApiError("Course access denied", 403, "FORBIDDEN");
    }
  }

  return createCoachingOffering({
    actorId: params.coachId,
    title: params.title,
    slug: params.slug,
    description: params.description,
    totalSessions: params.totalSessions,
    validDays: params.validDays,
    coachId: params.coachId,
    courseId: params.courseId,
    isActive: params.isActive,
    sessionTitles: params.sessionTitles,
  });
}

export async function updateCoachOffering(params: {
  coachId: string;
  offeringId: string;
  title?: string;
  description?: string;
  totalSessions?: number;
  validDays?: number;
  courseId?: string | null;
  isActive?: boolean;
  sessionTitles?: string[];
}) {
  await assertCoachOwnsOffering(params.coachId, params.offeringId);

  if (params.courseId) {
    const course = await prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course || course.instructorId !== params.coachId) {
      throw new ApiError("Course access denied", 403, "FORBIDDEN");
    }
  }

  return updateCoachingOffering({
    actorId: params.coachId,
    offeringId: params.offeringId,
    title: params.title,
    description: params.description,
    totalSessions: params.totalSessions,
    validDays: params.validDays,
    coachId: params.coachId,
    courseId: params.courseId,
    isActive: params.isActive,
    sessionTitles: params.sessionTitles,
  });
}

export async function listCoachEntitlements(coachId: string) {
  return prisma.coachingEntitlement.findMany({
    where: { coachId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      coachingOffering: { select: { id: true, title: true, slug: true } },
      _count: { select: { sessions: true } },
    },
  });
}
