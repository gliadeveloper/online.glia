"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { resolvePostLoginPath } from "@/lib/auth-redirect";
import type { UserRole } from "@/generated/prisma/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: { role?: UserRole };
      };

      if (!response.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      const next = searchParams.get("next");
      router.push(resolvePostLoginPath(next, data.user?.role ?? "USER"));
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const showDemoHints = process.env.NODE_ENV === "development";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-4">
        <legend className="sr-only">이메일 로그인</legend>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[var(--color-text-primary)]">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[var(--color-text-primary)]">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
            required
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="shell-focus-ring min-h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-action-primary-hover)] disabled:opacity-60"
      >
        {loading ? "로그인 중..." : "이메일로 로그인"}
      </button>

      {showDemoHints && (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          데모: customer@localhost / demo-password
          <br />
          demo@localhost (번들 구매) · admin@localhost (관리자)
        </p>
      )}
    </form>
  );
}
