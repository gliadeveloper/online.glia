"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CoachPublishBoard } from "@/components/coach/coach-publish-board";
import { CoachQnaInbox } from "@/components/coach/coach-qna-inbox";
import {
  displayName,
  type CoachHubTab,
  type CoachPublishRow,
  type PublishBoard,
} from "@/lib/coach-coaching-board";
import { coachingEntitlementLabels } from "@/lib/customer-labels";
import type { CoachingEntitlementStatus } from "@/generated/prisma/client";

type EntitlementRow = {
  id: string;
  status: CoachingEntitlementStatus;
  completedSessions: number;
  totalSessions: number;
  publishedCount: number;
  pendingReplyCount: number;
  validUntil: string | null;
  user: { id: string; name: string | null; email: string };
  coachingOffering: { id: string; title: string };
};

type OfferingRow = {
  id: string;
  title: string;
  slug: string;
  totalSessions: number;
  validDays: number;
  isActive: boolean;
};

type CustomerOption = { id: string; label: string };
type OfferingOption = { id: string; label: string };

type CoachCoachingHubProps = {
  tab: CoachHubTab;
  board: PublishBoard;
  qnaRows: CoachPublishRow[];
  entitlements: EntitlementRow[];
  offerings: OfferingRow[];
  customerOptions: CustomerOption[];
  offeringOptions: OfferingOption[];
  courseOptions: Array<{ id: string; label: string }>;
};

const tabs: Array<{ key: CoachHubTab; label: string }> = [
  { key: "publish", label: "발행" },
  { key: "qna", label: "미답 Q&A" },
  { key: "entitlements", label: "코칭권" },
  { key: "offerings", label: "상품" },
];

export function CoachCoachingHub(props: CoachCoachingHubProps) {
  const dueCount = props.board.overdue.length + props.board.today.length;
  const qnaCount = props.qnaRows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const badge =
            item.key === "publish" ? dueCount : item.key === "qna" ? qnaCount : 0;
          const active = props.tab === item.key;
          return (
            <Link
              key={item.key}
              href={`/coach/coaching?tab=${item.key}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-emerald-200"
              }`}
            >
              {item.label}
              {badge > 0 ? (
                <span className={`ml-2 ${active ? "text-emerald-100" : "text-amber-700"}`}>{badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {props.tab === "publish" ? <CoachPublishBoard board={props.board} /> : null}
      {props.tab === "qna" ? <CoachQnaInbox rows={props.qnaRows} /> : null}

      {props.tab === "entitlements" ? (
        <EntitlementsPanel
          entitlements={props.entitlements}
          customers={props.customerOptions}
          offerings={props.offeringOptions}
        />
      ) : null}

      {props.tab === "offerings" ? (
        <OfferingsPanel offerings={props.offerings} courses={props.courseOptions} />
      ) : null}
    </div>
  );
}

function EntitlementsPanel({
  entitlements,
  customers,
  offerings,
}: {
  entitlements: EntitlementRow[];
  customers: CustomerOption[];
  offerings: OfferingOption[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <GrantEntitlementForm customers={customers} offerings={offerings} onGranted={() => router.refresh()} />

      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {entitlements.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-zinc-500">부여된 코칭권이 없습니다.</li>
        ) : (
          entitlements.map((entitlement) => (
            <li key={entitlement.id}>
              <Link
                href={`/coach/coaching/entitlements/${entitlement.id}`}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">{displayName(entitlement.user)}</p>
                  <p className="mt-1 text-sm text-zinc-500">{entitlement.coachingOffering.title}</p>
                </div>
                <div className="text-right text-sm text-zinc-600">
                  <p>
                    발행 {entitlement.publishedCount}/{entitlement.totalSessions} ·{" "}
                    {coachingEntitlementLabels[entitlement.status]}
                  </p>
                  {entitlement.pendingReplyCount > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-amber-700">
                      미답 {entitlement.pendingReplyCount}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function OfferingsPanel({
  offerings,
  courses,
}: {
  offerings: OfferingRow[];
  courses: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <CreateOfferingForm courses={courses} onCreated={() => router.refresh()} />

      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {offerings.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-zinc-500">코칭 상품이 없습니다.</li>
        ) : (
          offerings.map((offering) => (
            <li key={offering.id}>
              <Link
                href={`/coach/coaching/offerings/${offering.id}`}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">{offering.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {offering.totalSessions}회 · {offering.validDays}일 · /{offering.slug}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    offering.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {offering.isActive ? "활성" : "비활성"}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function GrantEntitlementForm({
  customers,
  offerings,
  onGranted,
}: {
  customers: CustomerOption[];
  offerings: OfferingOption[];
  onGranted: () => void;
}) {
  const [userId, setUserId] = useState(customers[0]?.id ?? "");
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (customers.length === 0 || offerings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500">
        코칭권을 부여하려면 고객과 코칭 상품이 필요합니다.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/coach/coaching/entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, coachingOfferingId: offeringId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "부여에 실패했습니다.");
        return;
      }
      onGranted();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
    >
      {error && (
        <p className="col-span-full rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <select
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
      >
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.label}
          </option>
        ))}
      </select>
      <select
        value={offeringId}
        onChange={(event) => setOfferingId(event.target.value)}
        className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
      >
        {offerings.map((offering) => (
          <option key={offering.id} value={offering.id}>
            {offering.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        코칭권 부여
      </button>
    </form>
  );
}

function CreateOfferingForm({
  courses,
  onCreated,
}: {
  courses: Array<{ id: string; label: string }>;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [totalSessions, setTotalSessions] = useState("4");
  const [validDays, setValidDays] = useState("90");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/coach/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          totalSessions: Number(totalSessions),
          validDays: Number(validDays),
          courseId: courseId || undefined,
          isActive: true,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }
      setOpen(false);
      setTitle("");
      setSlug("");
      onCreated();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm font-medium text-emerald-800"
      >
        + 코칭 상품 추가
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목"
          required
          className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
        />
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="slug"
          required
          className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
        />
        <input
          type="number"
          value={totalSessions}
          onChange={(event) => setTotalSessions(event.target.value)}
          placeholder="회차"
          required
          className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
        />
        <input
          type="number"
          value={validDays}
          onChange={(event) => setValidDays(event.target.value)}
          placeholder="유효일"
          required
          className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
        />
      </div>
      {courses.length > 0 && (
        <select
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
        >
          <option value="">연결 코스 없음</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.label}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          생성
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}
