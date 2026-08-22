"use client";

import { CircleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { getAuthErrorMessage } from "@/lib/auth-errors";
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
        code?: string;
        user?: { role?: UserRole };
      };

      if (!response.ok) {
        if (data.code === "ONBOARDING_INCOMPLETE") {
          router.push("/signup/terms");
          return;
        }
        setError(getAuthErrorMessage(data.code, data.error));
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
    <form onSubmit={handleSubmit} className="glia-auth__form">
      <fieldset className="glia-auth__fields">
        <legend className="sr-only">이메일 로그인</legend>

        <div className="glia-auth__field">
          <label htmlFor="email" className="glia-auth__label">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="glia-auth__input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="glia-auth__field">
          <label htmlFor="password" className="glia-auth__label">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="glia-auth__input"
            required
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="glia-auth__alert">
          <CircleAlert size={16} strokeWidth={2} className="glia-auth__alert-icon" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="glia-auth__submit">
        {loading ? "로그인 중..." : "이메일로 로그인"}
      </button>

      {showDemoHints && (
        <p className="glia-auth__hint">
          데모: customer@localhost / demo-password
          <br />
          demo@localhost (번들 구매) · admin@localhost (관리자)
        </p>
      )}
    </form>
  );
}
