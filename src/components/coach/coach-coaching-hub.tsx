"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatDateTime } from "@/lib/admin-format";

type SessionRow = {
  id: string;
  sessionNo: number;
  title: string;
  scheduledAt: string;
  user: { name: string | null; email: string };
  entitlement: { coachingOffering: { title: string } };
};

type EntitlementRow = {
  id: string;
  status: string;
  completedSessions: number;
  totalSessions: number;
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
  _count?: { entitlements: number };
};

type CustomerOption = { id: string; label: string };
type OfferingOption = { id: string; label: string };

type CoachCoachingHubProps = {
  sessions: SessionRow[];
  entitlements: EntitlementRow[];
  offerings: OfferingRow[];
  customerOptions: CustomerOption[];
  offeringOptions: OfferingOption[];
  courseOptions: Array<{ id: string; label: string }>;
};

type Tab = "sessions" | "entitlements" | "offerings";

export function CoachCoachingHub(props: CoachCoachingHubProps) {
  const [tab, setTab] = useState<Tab>("sessions");
  const router = useRouter();

  const upcomingSessions = useMemo(
    () =>
      [...props.sessions].sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      ),
    [props.sessions],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["sessions", "세션"],
            ["entitlements", "코칭권"],
            ["offerings", "상품(오퍼링)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-emerald-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sessions" && (
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
              배정된 세션이 없습니다.
            </div>
          ) : (
            upcomingSessions.map((session) => (
              <Link
                key={session.id}
                href={`/coach/sessions/${session.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {session.sessionNo}회차 · {session.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {session.user.name ?? session.user.email} ·{" "}
                      {session.entitlement.coachingOffering.title}
                    </p>
                  </div>
                  <p className="text-right text-sm text-zinc-500">
                    {formatDateTime(new Date(session.scheduledAt))}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "entitlements" && (
        <div className="space-y-4">
          <GrantEntitlementForm
            customers={props.customerOptions}
            offerings={props.offeringOptions}
            onGranted={() => router.refresh()}
          />

          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {props.entitlements.length === 0 ? (
              <li className="px-5 py-12 text-center text-sm text-zinc-500">부여된 코칭권이 없습니다.</li>
            ) : (
              props.entitlements.map((entitlement) => (
                <li key={entitlement.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/coach/customers/${entitlement.user.id}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        {entitlement.user.name ?? entitlement.user.email}
                      </Link>
                      <p className="text-sm text-zinc-500">{entitlement.coachingOffering.title}</p>
                    </div>
                    <div className="text-right text-sm text-zinc-600">
                      <p>
                        {entitlement.completedSessions}/{entitlement.totalSessions}회 ·{" "}
                        {entitlement.status}
                      </p>
                      {entitlement.validUntil && (
                        <p className="mt-1 text-xs text-zinc-400">
                          ~{new Date(entitlement.validUntil).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {tab === "offerings" && (
        <div className="space-y-4">
          <CreateOfferingForm
            courses={props.courseOptions}
            onCreated={() => router.refresh()}
          />

          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {props.offerings.length === 0 ? (
              <li className="px-5 py-12 text-center text-sm text-zinc-500">코칭 상품이 없습니다.</li>
            ) : (
              props.offerings.map((offering) => (
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
                      offering.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-zinc-100 text-zinc-600"
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
      )}
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
