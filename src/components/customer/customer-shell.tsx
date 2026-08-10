"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "홈", exact: true },
  { href: "/shop", label: "상품" },
  { href: "/learning", label: "학습" },
  { href: "/coaching", label: "코칭" },
  { href: "/checkin", label: "체크인" },
  { href: "/orders", label: "주문" },
];

type CustomerShellProps = {
  userName: string;
  userEmail: string;
  userRole?: string;
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

  const base = mobile
    ? "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
    : "rounded-xl px-3 py-2 text-sm font-medium transition";

  return (
    <Link
      href={href}
      className={`${base} ${
        active
          ? "bg-violet-600 text-white shadow-sm shadow-violet-200"
          : mobile
            ? "bg-white/10 text-violet-100"
            : "text-zinc-600 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      {label}
    </Link>
  );
}

export function CustomerShell({
  userName,
  userEmail,
  userRole,
  children,
}: CustomerShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 via-zinc-50 to-zinc-50 font-sans text-zinc-900">
      <header className="border-b border-violet-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-violet-700">
              Glia Academy
            </Link>
            <p className="text-xs text-zinc-500">
              {userName} · {userEmail}
            </p>
          </div>

          <nav className="hidden flex-wrap items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink key={link.href} pathname={pathname} {...link} />
            ))}
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-xl px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              로그아웃
            </button>
          </nav>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {links.map((link) => (
            <NavLink key={link.href} pathname={pathname} mobile {...link} />
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
