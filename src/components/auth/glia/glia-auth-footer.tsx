"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type GliaAuthFooterProps = {
  active: "login" | "signup" | "find-account";
};

function buildAuthHref(path: string, searchParams: URLSearchParams) {
  const next = searchParams.get("next");
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function GliaAuthFooter({ active }: GliaAuthFooterProps) {
  const searchParams = useSearchParams();

  return (
    <footer className="glia-auth__footer">
      {active !== "signup" && (
        <p>
          아직 온라인 글리아 회원이 아니신가요?{" "}
          <Link href={buildAuthHref("/signup", searchParams)} className="glia-auth__link">
            회원가입
          </Link>
        </p>
      )}

      {active !== "login" && (
        <p>
          이미 회원이신가요?{" "}
          <Link href={buildAuthHref("/login", searchParams)} className="glia-auth__link">
            로그인
          </Link>
        </p>
      )}

      {active !== "find-account" && (
        <p>
          로그인 계정을 잊으셨나요?{" "}
          <Link
            href={buildAuthHref("/login/find-account", searchParams)}
            className="glia-auth__link"
          >
            계정 찾기
          </Link>
        </p>
      )}
    </footer>
  );
}
