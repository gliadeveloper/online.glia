import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachEntitlementBoard } from "@/components/coach/coach-entitlement-board";
import { ApiError } from "@/lib/api";
import { requireCoach } from "@/lib/coach";
import { getCoachEntitlementBoard } from "@/lib/coaching-coach";

type PageProps = { params: Promise<{ id: string }> };

export default async function CoachEntitlementPage({ params }: PageProps) {
  const user = await requireCoach();
  const { id } = await params;

  let entitlement;
  try {
    entitlement = await getCoachEntitlementBoard(id, user.id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <Link href="/coach/coaching?tab=entitlements" className="text-sm font-medium text-emerald-700 hover:underline">
        ← 코칭권 목록
      </Link>
      <CoachEntitlementBoard
        entitlement={{
          id: entitlement.id,
          status: entitlement.status,
          completedSessions: entitlement.completedSessions,
          totalSessions: entitlement.totalSessions,
          validUntil: entitlement.validUntil?.toISOString() ?? null,
          user: entitlement.user,
          coachingOffering: entitlement.coachingOffering,
        }}
        sessions={entitlement.sessions.map((session) => ({
          id: session.id,
          sessionNo: session.sessionNo,
          title: session.title,
          scheduledAt: session.scheduledAt.toISOString(),
          publicationStatus: session.publicationStatus,
          pendingReplyCount: session.conversation?.messages.length ?? 0,
          logCount: session._count.logs,
        }))}
      />
    </div>
  );
}
