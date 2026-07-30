import Link from "next/link";
import { notFound } from "next/navigation";

import { OfferingActions } from "@/app/admin/coaching-offerings/[id]/offering-actions";
import { OfferingEditPanel } from "@/app/admin/coaching-offerings/[id]/offering-edit-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { coachingOfferingInclude } from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCoachingOfferingDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const offering = await prisma.coachingOffering.findUnique({
    where: { id },
    include: coachingOfferingInclude,
  });

  if (!offering) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/coaching-offerings" className="text-sm font-medium text-violet-600">
        ← 코칭 상품 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{offering.title}</h1>
          <p className="font-mono text-sm text-zinc-500">{offering.slug}</p>
        </div>
        <OfferingActions offeringId={offering.id} isActive={offering.isActive} />
        <OfferingEditPanel
          offeringId={offering.id}
          title={offering.title}
          description={offering.description}
          totalSessions={offering.totalSessions}
          validDays={offering.validDays}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "회차", value: `${offering.totalSessions}회` },
          { label: "유효기간", value: `${offering.validDays}일` },
          { label: "템플릿", value: `${offering.sessionTemplates.length}개` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      {offering.description && (
        <p className="rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-600 shadow-sm">
          {offering.description}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">코치</p>
          <p className="mt-2 font-medium">
            {offering.coach?.name ?? offering.coach?.email ?? "미배정"}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">연결 코스</p>
          <p className="mt-2 font-medium">{offering.course?.title ?? "없음"}</p>
        </div>
      </div>

      {offering.sessionTemplates.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">회차 템플릿</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {offering.sessionTemplates.map((template) => (
              <li key={template.id} className="px-5 py-4 text-sm">
                <p className="font-medium">
                  {template.sessionNo}회 · {template.title}
                </p>
                <p className="mt-1 text-zinc-500">
                  오픈 +{template.scheduledOffsetDays}일
                  {template.summary ? ` · ${template.summary}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StatusBadge
        value={offering.isActive ? "PUBLISHED" : "ARCHIVED"}
        label={offering.isActive ? "활성" : "비활성"}
      />
    </div>
  );
}
