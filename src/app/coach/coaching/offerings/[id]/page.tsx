import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachOfferingEditPanel } from "@/components/coach/coach-offering-edit-panel";
import { requireCoach } from "@/lib/coach";
import { getCoachProductCatalog } from "@/lib/coach-commerce";
import { assertCoachOwnsOffering } from "@/lib/coach-offerings";

type PageProps = { params: Promise<{ id: string }> };

export default async function CoachOfferingDetailPage({ params }: PageProps) {
  const user = await requireCoach();
  const { id } = await params;

  let offering;
  try {
    offering = await assertCoachOwnsOffering(user.id, id);
  } catch {
    notFound();
  }

  const catalog = await getCoachProductCatalog(user.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/coach/coaching" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 코칭 관리
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{offering.title}</h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">{offering.slug}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "회차", value: `${offering.totalSessions}회` },
          { label: "유효기간", value: `${offering.validDays}일` },
          { label: "부여", value: `${offering._count.entitlements}명` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <CoachOfferingEditPanel
        offeringId={offering.id}
        title={offering.title}
        description={offering.description}
        totalSessions={offering.totalSessions}
        validDays={offering.validDays}
        isActive={offering.isActive}
        courseId={offering.courseId}
        sessionTemplates={offering.sessionTemplates}
        courses={catalog.courses}
      />
    </div>
  );
}
