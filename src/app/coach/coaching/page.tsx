import { CoachCoachingHub } from "@/components/coach/coach-coaching-hub";
import {
  defaultCoachHubTab,
  groupPublishBoard,
  parseCoachHubTab,
  qnaInboxRows,
  toCoachPublishRow,
} from "@/lib/coach-coaching-board";
import { requireCoach } from "@/lib/coach";
import { getCoachProductCatalog } from "@/lib/coach-commerce";
import { listCoachCustomers } from "@/lib/coach-customers";
import { listCoachEntitlements, listCoachOfferings } from "@/lib/coach-offerings";
import { listCoachSessions } from "@/lib/coaching-coach";

type PageProps = { searchParams: Promise<{ tab?: string }> };

export default async function CoachCoachingPage({ searchParams }: PageProps) {
  const user = await requireCoach();
  const { tab: requestedTab } = await searchParams;

  const [sessions, entitlements, offerings, customers, catalog] = await Promise.all([
    listCoachSessions(user.id),
    listCoachEntitlements(user.id),
    listCoachOfferings(user.id),
    listCoachCustomers(user.id),
    getCoachProductCatalog(user.id),
  ]);

  const rows = sessions.map(toCoachPublishRow);
  const board = groupPublishBoard(rows);
  const qnaRows = qnaInboxRows(rows);
  const tab = parseCoachHubTab(requestedTab) ?? defaultCoachHubTab(board, qnaRows.length);

  const customerOptions = customers.map((customer) => ({
    id: customer.userId,
    label: `${customer.name ?? customer.email} (${customer.email})`,
  }));

  const offeringOptions = offerings.map((offering) => ({
    id: offering.id,
    label: offering.title,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Coaching</p>
        <h1 className="text-3xl font-semibold tracking-tight">코칭 관리</h1>
        <p className="mt-1 text-zinc-600">발행일 기준으로 오늘 열 페이지를 쓰고, 미답 질문에 답합니다.</p>
      </div>

      <CoachCoachingHub
        tab={tab}
        board={board}
        qnaRows={qnaRows}
        entitlements={entitlements.map((entitlement) => {
          const own = rows.filter((row) => row.entitlement.id === entitlement.id);
          return {
            id: entitlement.id,
            status: entitlement.status,
            completedSessions: entitlement.completedSessions,
            totalSessions: entitlement.totalSessions,
            publishedCount: own.filter((row) => row.publicationStatus === "PUBLISHED").length,
            pendingReplyCount: own.reduce((sum, row) => sum + row.pendingReplyCount, 0),
            validUntil: entitlement.validUntil?.toISOString() ?? null,
            user: entitlement.user,
            coachingOffering: entitlement.coachingOffering,
          };
        })}
        offerings={offerings.map((offering) => ({
          id: offering.id,
          title: offering.title,
          slug: offering.slug,
          totalSessions: offering.totalSessions,
          validDays: offering.validDays,
          isActive: offering.isActive,
        }))}
        customerOptions={customerOptions}
        offeringOptions={offeringOptions}
        courseOptions={catalog.courses}
      />
    </div>
  );
}
