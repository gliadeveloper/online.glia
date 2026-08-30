"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CoachCustomerRow } from "@/lib/coach-customers";

type CoachCustomerHubProps = {
  customers: CoachCustomerRow[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CoachCustomerHub({ customers }: CoachCustomerHubProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;

    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(normalized) ||
        customer.email.toLowerCase().includes(normalized) ||
        customer.enrollments.some((enrollment) =>
          enrollment.courseTitle.toLowerCase().includes(normalized),
        ) ||
        customer.coachingEntitlements.some((entitlement) =>
          entitlement.offeringTitle.toLowerCase().includes(normalized),
        ),
    );
  }, [customers, query]);

  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
        <p className="font-medium text-zinc-800">아직 고객이 없습니다</p>
        <p className="mt-2 text-sm text-zinc-500">상품 판매 또는 코칭권 부여 후 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">고객 검색</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름, 이메일, 코스·코칭명 검색"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
        />
      </label>

      <ul className="space-y-3">
        {filtered.map((customer) => (
          <li key={customer.userId}>
            <Link
              href={`/coach/customers/${customer.userId}`}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
            >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">{customer.name ?? "이름 없음"}</p>
                <p className="text-sm text-zinc-500">{customer.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {customer.pendingOrderCount > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    승인 대기 {customer.pendingOrderCount}
                  </span>
                ) : null}
                {customer.lastActivityAt && (
                  <p className="text-xs text-zinc-400">
                    최근 활동 {formatDate(customer.lastActivityAt)}
                  </p>
                )}
              </div>
            </div>

            {customer.enrollments.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">LMS</p>
                <ul className="mt-2 space-y-2">
                  {customer.enrollments.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-zinc-800">{enrollment.courseTitle}</span>
                      <span className="text-zinc-500">
                        {enrollment.progressPercent}% · {enrollment.status} ·{" "}
                        {formatDate(enrollment.enrolledAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {customer.coachingEntitlements.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">코칭</p>
                <ul className="mt-2 space-y-2">
                  {customer.coachingEntitlements.map((entitlement) => (
                    <li
                      key={entitlement.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50/60 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-zinc-800">{entitlement.offeringTitle}</span>
                      <span className="text-zinc-600">
                        {entitlement.completedSessions}/{entitlement.totalSessions}회 ·{" "}
                        {entitlement.status}
                        {entitlement.validUntil && ` · ~${formatDate(entitlement.validUntil)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-600">
          검색 결과가 없습니다.
        </p>
      )}
    </div>
  );
}
