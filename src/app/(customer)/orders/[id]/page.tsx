import Link from "next/link";
import { notFound } from "next/navigation";

import { formatKrw, orderStatusLabels, productKindLabels } from "@/lib/customer-labels";
import { orderInclude } from "@/lib/fulfillment";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ purchased?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const { purchased } = await searchParams;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: orderInclude,
  });

  if (!order) notFound();

  const product = order.lines[0]?.product;

  return (
    <div className="space-y-6">
      <Link href="/orders" className="text-sm font-medium text-violet-600">
        ← 주문 목록
      </Link>

      {purchased === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          결제가 완료되었습니다. 아래에서 수강·코칭 이용을 시작하세요.
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{product?.title ?? "주문"}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {order.createdAt.toLocaleString("ko-KR")} · #{order.id.slice(0, 8)}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
            {orderStatusLabels[order.status]}
          </span>
        </div>

        <p className="mt-6 text-3xl font-semibold">{formatKrw(order.total)}</p>

        {product && (
          <div className="mt-6 space-y-3 border-t border-zinc-100 pt-6">
            <p className="text-sm font-medium text-zinc-500">포함 항목</p>
            {product.items.map((item) => (
              <div key={item.id} className="rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <p className="font-medium">
                  {item.course?.title ?? item.coachingOffering?.title}
                </p>
                <p className="mt-1 text-zinc-500">{item.kind}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {product?.items.some((item) => item.courseId) && (
            <Link
              href="/lms"
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              LMS로 이동
            </Link>
          )}
          {product?.items.some((item) => item.coachingOfferingId) && (
            <Link
              href="/coaching"
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium"
            >
              코칭 예약
            </Link>
          )}
          {product && (
            <span className="self-center text-xs text-zinc-500">
              {productKindLabels[product.kind]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
