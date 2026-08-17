"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CoachCheckInMemberRow } from "@/lib/coach-checkins";

function displayDate(date: string | null) {
  if (!date) return "기록 없음";
  return date.length === 10 ? date : date;
}

export function CoachCheckInHub({ members }: { members: CoachCheckInMemberRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter((member) =>
      [member.nickname ?? "", member.publicUserId].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [members, query]);

  if (members.length === 0) {
    return <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center"><p className="font-medium text-zinc-800">열람이 허용된 회원이 없습니다</p><p className="mt-2 text-sm text-zinc-500">회원이 체크인 접근을 허용하면 이곳에서 모든 기록을 볼 수 있습니다.</p></div>;
  }

  return <div className="space-y-4">
    <label className="block"><span className="sr-only">회원 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임 또는 사용자 ID 검색" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm" /></label>
    <ul className="space-y-3">
      {filtered.map((member) => <li key={member.publicUserId}><Link href={`/coach/checkins/${member.publicUserId}`} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"><div className="flex min-w-0 items-center gap-3">{member.avatarUrl ? (
        // Avatar URLs are user-provided and may be hosted on arbitrary domains.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">{(member.nickname ?? member.publicUserId).slice(0, 1)}</div>}<div className="min-w-0"><p className="truncate font-semibold text-zinc-900">{member.nickname ?? "이름 없음"}</p><p className="truncate text-sm text-zinc-500">@{member.publicUserId}</p></div></div><div className="shrink-0 text-right text-xs text-zinc-500"><p>데일리 {displayDate(member.latestDailyDate)}</p><p className="mt-1">주간 {displayDate(member.latestWeeklyDate)}</p></div></Link></li>)}
    </ul>
    {filtered.length === 0 && <p className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-600">검색 결과가 없습니다.</p>}
  </div>;
}
