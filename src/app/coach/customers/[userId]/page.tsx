import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachCustomerDetailPanel } from "@/components/coach/coach-customer-detail-panel";
import { requireCoach } from "@/lib/coach";
import { getCoachCustomerDetail } from "@/lib/coach-customers";

type PageProps = { params: Promise<{ userId: string }> };

export default async function CoachCustomerDetailPage({ params }: PageProps) {
  const coach = await requireCoach();
  const { userId } = await params;

  let detail;
  try {
    detail = await getCoachCustomerDetail(coach.id, userId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/coach/customers" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 고객 목록
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">고객 상세</h1>
        <p className="mt-1 text-zinc-600">수강·코칭·주문을 한 화면에서 확인합니다.</p>
      </div>

      <CoachCustomerDetailPanel detail={detail} />
    </div>
  );
}
