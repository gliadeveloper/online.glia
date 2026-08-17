import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCoach } from "@/lib/coach";
import { getCoachCheckInMember, listCoachCheckInSubmissions, type CoachCheckInKind } from "@/lib/coach-checkins";

type PageProps = {
  params: Promise<{ memberUserId: string }>;
  searchParams: Promise<{ kind?: string }>;
};

function labelFor(kind: CoachCheckInKind, date: string) {
  return kind === "daily" ? date : `${date} 주간`;
}

export default async function CoachCheckInMemberPage({ params, searchParams }: PageProps) {
  const coach = await requireCoach();
  const { memberUserId } = await params;
  const { kind: requestedKind } = await searchParams;
  const kind: CoachCheckInKind = requestedKind === "weekly" ? "weekly" : "daily";

  let member;
  let records;
  try {
    member = await getCoachCheckInMember(coach.id, memberUserId);
    ({ submissions: records } = await listCoachCheckInSubmissions({ coachId: coach.id, memberPublicUserId: memberUserId, kind }));
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/coach/checkins" className="text-sm text-zinc-500 hover:text-zinc-800">← 체크인 열람</Link>
        <div className="mt-4 flex items-center gap-3">
          {member.profile?.avatarUrl ? (
            // Avatar URLs are user-provided and may be hosted on arbitrary domains.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.profile.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">{(member.name ?? member.userId).slice(0, 1)}</div>}
          <div><h1 className="text-2xl font-semibold tracking-tight">{member.name ?? "이름 없음"}</h1><p className="text-sm text-zinc-500">@{member.userId} · 체크인 열람 허용됨</p></div>
        </div>
      </div>

      <nav className="flex gap-2 border-b border-zinc-200" aria-label="체크인 종류">
        {(["daily", "weekly"] as const).map((item) => <Link key={item} href={`/coach/checkins/${member.userId}?kind=${item}`} className={`border-b-2 px-4 py-3 text-sm font-medium ${kind === item ? "border-emerald-600 text-emerald-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>{item === "daily" ? "데일리" : "주간"}</Link>)}
      </nav>

      {records.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center"><p className="font-medium text-zinc-800">아직 {kind === "daily" ? "데일리" : "주간"} 체크인 기록이 없습니다</p></div> : <ul className="space-y-3">{records.map((record) => <li key={record.id}><details className="rounded-2xl border border-zinc-200 bg-white shadow-sm"><summary className="cursor-pointer list-none px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-zinc-900">{labelFor(kind, record.checkInDate)}</p><p className="mt-1 text-xs text-zinc-500">최종 수정 {record.updatedAt.toLocaleDateString("ko-KR")}</p></div><span className="text-sm font-medium text-emerald-700">기록 보기</span></div></summary><div className="border-t border-zinc-100 px-5 py-4">{record.answers.length === 0 ? <p className="text-sm text-zinc-500">저장된 응답이 없습니다.</p> : <dl className="space-y-4">{record.answers.map((answer, index) => <div key={`${record.id}-${index}`}><dt className="text-sm font-medium text-zinc-700">{answer.question}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-900">{answer.value}</dd></div>)}</dl>}</div></details></li>)}</ul>}
    </div>
  );
}
