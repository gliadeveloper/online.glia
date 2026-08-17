import { CoachCoachingHub } from "@/components/coach/coach-coaching-hub";
import { requireCoach } from "@/lib/coach";
import { getCoachProductCatalog } from "@/lib/coach-commerce";
import { listCoachCustomers } from "@/lib/coach-customers";
import { listCoachEntitlements, listCoachOfferings } from "@/lib/coach-offerings";
import { listCoachSessions } from "@/lib/coaching-coach";

export default async function CoachCoachingPage() {
  const user = await requireCoach();

  const [sessions, entitlements, offerings, customers, catalog] = await Promise.all([
    listCoachSessions(user.id),
    listCoachEntitlements(user.id),
    listCoachOfferings(user.id),
    listCoachCustomers(user.id),
    getCoachProductCatalog(user.id),
  ]);

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
        <p className="mt-1 text-zinc-600">세션·코칭권·코칭 상품을 운영합니다.</p>
      </div>

      <CoachCoachingHub
        sessions={sessions.map((session) => ({
          id: session.id,
          sessionNo: session.sessionNo,
          title: session.title,
          scheduledAt: session.scheduledAt.toISOString(),
          user: session.user,
          entitlement: session.entitlement,
        }))}
        entitlements={entitlements.map((entitlement) => ({
          id: entitlement.id,
          status: entitlement.status,
          completedSessions: entitlement.completedSessions,
          totalSessions: entitlement.totalSessions,
          validUntil: entitlement.validUntil?.toISOString() ?? null,
          user: entitlement.user,
          coachingOffering: entitlement.coachingOffering,
        }))}
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
