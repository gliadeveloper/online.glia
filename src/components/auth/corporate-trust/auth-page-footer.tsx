"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type AuthPageFooterProps = {
  active: "login" | "signup" | "find-account";
};

function buildAuthHref(path: string, searchParams: URLSearchParams) {
  const next = searchParams.get("next");
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function AuthPageFooter({ active }: AuthPageFooterProps) {
  const searchParams = useSearchParams();
  const signupHref = buildAuthHref("/signup", searchParams);
  const loginHref = buildAuthHref("/login", searchParams);
  const findAccountHref = buildAuthHref("/login/find-account", searchParams);

  return (
    <footer className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
      {active !== "signup" && (
        <p>
          아직 온라인 글리아 회원이 아니신가요?{" "}
          <Link href={signupHref} className="auth-trust-link auth-trust-focus rounded-sm">
            회원가입
          </Link>
        </p>
      )}

      {active !== "login" && (
        <p>
          이미 회원이신가요?{" "}
          <Link href={loginHref} className="auth-trust-link auth-trust-focus rounded-sm">
            로그인
          </Link>
        </p>
      )}

      {active !== "find-account" && (
        <p>
          로그인 계정을 잊으셨나요?{" "}
          <Link href={findAccountHref} className="auth-trust-link auth-trust-focus rounded-sm">
            계정 찾기
          </Link>
        </p>
      )}
    </footer>
  );
}
