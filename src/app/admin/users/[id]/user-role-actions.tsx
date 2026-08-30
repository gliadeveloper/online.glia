"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_OPTIONS = [
  { value: "USER", label: "회원" },
  { value: "COACH", label: "코치" },
  { value: "ADMIN", label: "관리자" },
] as const;

type UserRoleActionsProps = {
  userId: string;
  currentRole: string;
  userEmail: string;
};

export function UserRoleActions({
  userId,
  currentRole,
  userEmail,
}: UserRoleActionsProps) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = role !== currentRole;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!changed) return;

    const nextLabel = ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
    if (
      !window.confirm(
        `${userEmail} 계정을 ${nextLabel}로 변경할까요? 다음 로그인부터 포털이 바뀝니다.`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "역할 변경에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3"
    >
      <div>
        <h2 className="font-semibold">역할 변경</h2>
        <p className="mt-1 text-sm text-zinc-500">
          코치로 바꾸면 `/coach` 포털에 들어갈 수 있습니다. 관리자는 `/admin`만 사용합니다.
        </p>
      </div>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={!changed || loading}
        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "변경 중..." : "역할 저장"}
      </button>
    </form>
  );
}
