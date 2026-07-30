import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachOrderDetailPanel } from "@/components/coach/coach-order-detail-panel";
import { requireCoach } from "@/lib/coach";
import { getCoachOrder } from "@/lib/coach-orders";

type PageProps = { params: Promise<{ id: string }> };

export default async function CoachOrderDetailPage({ params }: PageProps) {
  const user = await requireCoach();
  const { id } = await params;

  let detail;
  try {
    detail = await getCoachOrder(user.id, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/coach/orders" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 주문 목록
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">주문 상세</h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">{detail.order.id}</p>
      </div>

      <CoachOrderDetailPanel {...detail} />
    </div>
  );
}
