import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const coachSelect = {
  id: true,
  userId: true,
  name: true,
  profile: { select: { avatarUrl: true, headline: true } },
} as const;

export async function listCheckInAccesses(userId: string) {
  return prisma.coachCheckInAccess.findMany({
    where: { userId, revokedAt: null },
    orderBy: { grantedAt: "desc" },
    select: { coach: { select: coachSelect }, grantedAt: true },
  });
}

export async function searchCoachesForCheckInAccess(params: { userId: string; query: string }) {
  const query = params.query.trim().toLowerCase();
  if (query.length < 2) return [];

  const coaches = await prisma.user.findMany({
    where: {
      id: { not: params.userId },
      role: "COACH",
      status: "ACTIVE",
      userId: { startsWith: query, mode: "insensitive" },
    },
    orderBy: { userId: "asc" },
    take: 10,
    select: coachSelect,
  });

  const activeAccesses = await prisma.coachCheckInAccess.findMany({
    where: { userId: params.userId, revokedAt: null, coachId: { in: coaches.map((coach) => coach.id) } },
    select: { coachId: true },
  });
  const activeCoachIds = new Set(activeAccesses.map((access) => access.coachId));

  return coaches.map((coach) => ({ ...coach, accessGranted: activeCoachIds.has(coach.id) }));
}

export async function grantCheckInAccess(params: { userId: string; coachPublicUserId: string }) {
  const coach = await prisma.user.findFirst({
    where: {
      userId: params.coachPublicUserId.trim().toLowerCase(),
      role: "COACH",
      status: "ACTIVE",
    },
    select: coachSelect,
  });

  if (!coach) throw new ApiError("코치 ID를 다시 확인해 주세요.", 404, "COACH_NOT_FOUND");
  if (coach.id === params.userId) throw new ApiError("본인에게는 접근을 허용할 수 없습니다.", 400, "INVALID_COACH");

  const access = await prisma.coachCheckInAccess.upsert({
    where: { userId_coachId: { userId: params.userId, coachId: coach.id } },
    create: { userId: params.userId, coachId: coach.id },
    update: { grantedAt: new Date(), revokedAt: null },
  });

  await writeAuditLog({
    actorId: params.userId,
    entityType: "CoachCheckInAccess",
    entityId: access.id,
    action: "CHECKIN_ACCESS_GRANTED",
    metadata: { coachId: coach.id, coachUserId: coach.userId },
  });

  return coach;
}

export async function revokeCheckInAccess(params: { userId: string; coachPublicUserId: string }) {
  const coach = await prisma.user.findFirst({
    where: { userId: params.coachPublicUserId.trim().toLowerCase(), role: "COACH" },
    select: { id: true, userId: true },
  });
  if (!coach) throw new ApiError("코치 ID를 다시 확인해 주세요.", 404, "COACH_NOT_FOUND");

  const access = await prisma.coachCheckInAccess.findUnique({
    where: { userId_coachId: { userId: params.userId, coachId: coach.id } },
  });
  if (!access || access.revokedAt) throw new ApiError("현재 접근을 허용한 코치가 아닙니다.", 404, "ACCESS_NOT_FOUND");

  const revoked = await prisma.coachCheckInAccess.update({
    where: { id: access.id },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    actorId: params.userId,
    entityType: "CoachCheckInAccess",
    entityId: revoked.id,
    action: "CHECKIN_ACCESS_REVOKED",
    metadata: { coachId: coach.id, coachUserId: coach.userId },
  });
}
