"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GrantEntitlementPanelProps = {
  users: Array<{ id: string; label: string }>;
  offerings: Array<{ id: string; label: string }>;
};

export function GrantEntitlementPanel({ users, offerings }: GrantEntitlementPanelProps) {
  const router = useRouter();
  const [targetUserId, setTargetUserId] = useState(users[0]?.id ?? "");
  const [coachingOfferingId, setCoachingOfferingId] = useState(offerings[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/admin/coaching/entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, coachingOfferingId }),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
      <h2 className="font-semibold">코칭권 수동 부여</h2>
      <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.label}</option>
        ))}
      </select>
      <select value={coachingOfferingId} onChange={(e) => setCoachingOfferingId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
        {offerings.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? "처리 중..." : "코칭권 부여"}
      </button>
    </form>
  );
}
