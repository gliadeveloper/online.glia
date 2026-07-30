import { ensureUserCoachingSessionsProvisioned } from "@/lib/coaching-provision";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getUserCoachingEntitlements(userId: string) {
  await ensureUserCoachingSessionsProvisioned(userId);

  return prisma.coachingEntitlement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      coachingOffering: {
        select: {
          title: true,
          totalSessions: true,
          validDays: true,
        },
      },
      course: { select: { title: true, slug: true } },
      sessions: {
        orderBy: { sessionNo: "asc" },
        include: {
          coach: { select: { name: true, email: true } },
          conversation: {
            select: {
              messages: {
                where: { awaitingReply: true },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
}

export type UserCoachingEntitlement = Awaited<
  ReturnType<typeof getUserCoachingEntitlements>
>[number];

const homeFeedSessionInclude = {
  coach: { select: { name: true, email: true } },
  entitlement: {
    select: {
      coachingOffering: { select: { title: true } },
    },
  },
  conversation: {
    select: {
      messages: {
        where: { awaitingReply: true },
        select: { id: true },
      },
    },
  },
  progress: { select: { status: true } },
} satisfies Prisma.CoachingSessionInclude;

export type HomeFeedCoachingSession = Awaited<
  ReturnType<typeof getUserCoachingSessionsForHomeFeed>
>[number];

function compareCoachingSessionsForHome(
  a: {
    publicationStatus: string;
    scheduledAt: Date;
    conversation: { messages: { id: string }[] } | null;
    progress: { status: string } | null;
  },
  b: {
    publicationStatus: string;
    scheduledAt: Date;
    conversation: { messages: { id: string }[] } | null;
    progress: { status: string } | null;
  },
) {
  const pendingA = a.conversation?.messages.length ?? 0;
  const pendingB = b.conversation?.messages.length ?? 0;
  if (pendingA !== pendingB) {
    return pendingB - pendingA;
  }

  const publicationOrder = { PUBLISHED: 0, DRAFT: 1, EMPTY: 2 } as const;
  const pubA = publicationOrder[a.publicationStatus as keyof typeof publicationOrder] ?? 3;
  const pubB = publicationOrder[b.publicationStatus as keyof typeof publicationOrder] ?? 3;
  if (pubA !== pubB) {
    return pubA - pubB;
  }

  const inProgressA = a.progress?.status === "IN_PROGRESS" ? 0 : 1;
  const inProgressB = b.progress?.status === "IN_PROGRESS" ? 0 : 1;
  if (inProgressA !== inProgressB) {
    return inProgressA - inProgressB;
  }

  return a.scheduledAt.getTime() - b.scheduledAt.getTime();
}

/** Active entitlement sessions for home feed — actionable items first, capped at `limit`. */
export async function getUserCoachingSessionsForHomeFeed(userId: string, limit = 5) {
  await ensureUserCoachingSessionsProvisioned(userId);

  const sessions = await prisma.coachingSession.findMany({
    where: {
      userId,
      entitlement: { status: "ACTIVE" },
    },
    include: homeFeedSessionInclude,
  });

  return sessions.sort(compareCoachingSessionsForHome).slice(0, limit);
}
