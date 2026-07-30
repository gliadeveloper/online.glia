import type { Prisma } from "@/generated/prisma/client";

import { addDays } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;

export async function provisionCoachingSessions(
  tx: TransactionClient,
  params: {
    entitlementId: string;
    userId: string;
    coachId: string;
    offeringId: string;
    totalSessions: number;
    validFrom: Date;
  },
) {
  const [templates, existingSessions] = await Promise.all([
    tx.coachingOfferingSessionTemplate.findMany({
      where: { offeringId: params.offeringId },
      orderBy: { sessionNo: "asc" },
    }),
    tx.coachingSession.findMany({
      where: { entitlementId: params.entitlementId },
      select: { sessionNo: true },
    }),
  ]);

  const existingSessionNos = new Set(existingSessions.map((session) => session.sessionNo));
  const templateByNo = new Map(templates.map((t) => [t.sessionNo, t]));

  for (let sessionNo = 1; sessionNo <= params.totalSessions; sessionNo++) {
    if (existingSessionNos.has(sessionNo)) {
      continue;
    }

    const template = templateByNo.get(sessionNo);
    const scheduledAt = addDays(params.validFrom, template?.scheduledOffsetDays ?? 0);

    const session = await tx.coachingSession.create({
      data: {
        entitlementId: params.entitlementId,
        coachId: params.coachId,
        userId: params.userId,
        sessionNo,
        title: template?.title ?? `${sessionNo}회차`,
        summary: template?.summary,
        scheduledAt,
        publicationStatus: "EMPTY",
      },
    });

    await tx.coachingSessionConversation.create({
      data: {
        sessionId: session.id,
        studentId: params.userId,
        coachId: params.coachId,
      },
    });

    await tx.coachingSessionProgress.create({
      data: {
        sessionId: session.id,
        userId: params.userId,
      },
    });
  }
}

export async function ensureCoachingSessionsProvisioned(entitlementId: string) {
  const entitlement = await prisma.coachingEntitlement.findUnique({
    where: { id: entitlementId },
    include: {
      coachingOffering: { select: { id: true, coachId: true } },
      _count: { select: { sessions: true } },
    },
  });

  if (!entitlement) {
    return;
  }

  const coachId = entitlement.coachId ?? entitlement.coachingOffering.coachId;
  if (!coachId) {
    return;
  }

  if (entitlement._count.sessions >= entitlement.totalSessions) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await provisionCoachingSessions(tx, {
      entitlementId: entitlement.id,
      userId: entitlement.userId,
      coachId,
      offeringId: entitlement.coachingOfferingId,
      totalSessions: entitlement.totalSessions,
      validFrom: entitlement.validFrom,
    });
  });
}

export async function ensureUserCoachingSessionsProvisioned(userId: string) {
  const entitlements = await prisma.coachingEntitlement.findMany({
    where: { userId },
    include: { _count: { select: { sessions: true } } },
  });

  for (const entitlement of entitlements) {
    if (entitlement._count.sessions < entitlement.totalSessions) {
      await ensureCoachingSessionsProvisioned(entitlement.id);
    }
  }
}

export async function syncOfferingSessionTemplates(
  tx: TransactionClient,
  offeringId: string,
  totalSessions: number,
  titles?: string[],
) {
  const existing = await tx.coachingOfferingSessionTemplate.findMany({
    where: { offeringId },
    orderBy: { sessionNo: "asc" },
  });

  for (let sessionNo = 1; sessionNo <= totalSessions; sessionNo++) {
    const title = titles?.[sessionNo - 1] ?? `${sessionNo}회차`;
    const current = existing.find((t) => t.sessionNo === sessionNo);

    if (current) {
      await tx.coachingOfferingSessionTemplate.update({
        where: { id: current.id },
        data: { title, sortOrder: sessionNo },
      });
    } else {
      await tx.coachingOfferingSessionTemplate.create({
        data: {
          offeringId,
          sessionNo,
          title,
          sortOrder: sessionNo,
        },
      });
    }
  }

  await tx.coachingOfferingSessionTemplate.deleteMany({
    where: {
      offeringId,
      sessionNo: { gt: totalSessions },
    },
  });
}
