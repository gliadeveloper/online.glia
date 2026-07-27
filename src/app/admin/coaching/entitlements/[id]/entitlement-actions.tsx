"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EntitlementActionsProps = {
  entitlementId: string;
  status: string;
};

export function EntitlementActions({ entitlementId, status }: EntitlementActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string, body: object) {
    setLoading(action);
    try {
      await fetch(`/api/admin/coaching/entitlements/${entitlementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "SUSPENDED" && (
        <button
          type="button"
          onClick={() => run("suspend", { status: "SUSPENDED" })}
          disabled={loading !== null}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
        >
          정지
        </button>
      )}
      {status !== "REVOKED" && (
        <button
          type="button"
          onClick={() => run("revoke", { status: "REVOKED" })}
          disabled={loading !== null}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
        >
          회수
        </button>
      )}
      {status !== "ACTIVE" && (
        <button
          type="button"
          onClick={() => run("activate", { status: "ACTIVE" })}
          disabled={loading !== null}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          활성화
        </button>
      )}
      <button
        type="button"
        onClick={() => run("extend", { extendDays: 7 })}
        disabled={loading !== null}
        className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
      >
        +7일 연장
      </button>
    </div>
  );
}
