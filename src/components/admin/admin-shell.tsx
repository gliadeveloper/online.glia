"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navSections = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "대시보드", exact: true }],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "상품" },
      { href: "/admin/courses", label: "코스" },
      { href: "/admin/coaching-offerings", label: "코칭 상품" },
      { href: "/admin/taxonomy", label: "Taxonomy" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/forms", label: "폼" },
      { href: "/admin/checkins", label: "체크인" },
      { href: "/admin/enrollments", label: "수강" },
      { href: "/admin/coaching/entitlements", label: "코칭권" },
      { href: "/admin/coaching/sessions", label: "코칭 세션" },
    ],
  },
  {
    label: "Commerce",
    items: [{ href: "/admin/orders", label: "주문" }],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "사용자" },
      { href: "/admin/audit-logs", label: "감사 로그" },
    ],
  },
];

type AdminShellProps = {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
};

function NavLink({
  href,
  label,
  exact,
  pathname,
  mobile,
}: {
  href: string;
  label: string;
  exact?: boolean;
  pathname: string;
  mobile?: boolean;
}) {
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  if (mobile) {
    return (
      <Link
        href={href}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
          active ? "bg-violet-600 text-white" : "bg-zinc-900 text-zinc-400"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-violet-600 text-white shadow-lg shadow-violet-950/40"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function AdminShell({ userName, userEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const flatItems = navSections.flatMap((section) => section.items);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
          <div className="border-b border-zinc-800 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Glia Admin
            </p>
            <p className="mt-1 text-sm font-medium text-white">Operations Console</p>
            <p className="mt-2 text-xs text-zinc-500">
              {userName} · {userEmail}
            </p>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink key={item.href} pathname={pathname} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-zinc-800 px-3 py-4">
            <Link
              href="/dashboard"
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              고객 화면 보기
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
                <p className="text-sm font-semibold text-white">Glia Admin</p>
                <p className="text-xs text-zinc-500">{userEmail}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300"
                >
                  고객 화면
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-500"
                >
                  로그아웃
                </button>
              </div>
            </div>
            <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {flatItems.map((item) => (
                <NavLink key={item.href} pathname={pathname} mobile {...item} />
              ))}
            </nav>
          </header>

          <main className="flex-1 bg-zinc-50 text-zinc-900">
            <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
