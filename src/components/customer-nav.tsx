"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "홈" },
  { href: "/shop", label: "상품" },
  { href: "/learning", label: "LMS" },
  { href: "/coaching", label: "코칭" },
  { href: "/checkin", label: "체크인" },
];

type CustomerNavProps = {
  userName: string;
  userEmail: string;
  userRole?: string;
};

export function CustomerNav({ userName, userEmail, userRole }: CustomerNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Glia Academy</p>
          <p className="text-xs text-zinc-500">
            {userName} · {userEmail}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {userRole === "ADMIN" && (
            <Link
              href="/admin"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname.startsWith("/admin")
                  ? "bg-violet-600 text-white"
                  : "text-violet-700 hover:bg-violet-50"
              }`}
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
