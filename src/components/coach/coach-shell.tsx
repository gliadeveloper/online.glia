"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/coach", label: "홈", exact: true },
  { href: "/coach/products", label: "상품", exact: false },
  { href: "/coach/orders", label: "주문", exact: false },
  { href: "/coach/customers", label: "고객", exact: false },
  { href: "/coach/courses", label: "코스", exact: false },
  { href: "/coach/live", label: "라이브", exact: false },
  { href: "/coach/coaching", label: "코칭", exact: false },
];

type CoachShellProps = {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
};

export function CoachShell({ userName, userEmail, children }: CoachShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
          <div className="border-b border-zinc-800 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Glia Coach
            </p>
            <p className="mt-1 text-sm font-medium text-white">코치 포털</p>
            <p className="mt-2 text-xs text-zinc-500">
              {userName} · {userEmail}
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-zinc-800 px-3 py-4">
            <Link
              href="/"
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              앱 홈
            </Link>
            <Link
              href="/mypage"
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              마이페이지
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
            >
              로그아웃
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Glia Coach</p>
                <p className="text-xs text-zinc-500">{userEmail}</p>
              </div>
              <Link
                href="/"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300"
              >
                앱 홈
              </Link>
            </div>
          </header>

          <main className="flex-1 bg-zinc-50 text-zinc-900">
            <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
