import Link from "next/link";

import type { ProductKind } from "@/generated/prisma/client";
import { productKindLabels } from "@/lib/customer-labels";

export function ShopEmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="shop-trust-empty">
      <p className="text-sm text-slate-600">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ShopButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "corp-trust-focus",
        variant === "primary" ? "corp-trust-btn-primary" : "corp-trust-btn-secondary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

function KindIcon({ kind }: { kind: ProductKind }) {
  if (kind === "COURSE_ONLY") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }

  if (kind === "COACHING_ONLY") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    );
  }

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

export function ShopKindBadge({ kind }: { kind: ProductKind }) {
  return (
    <span className="shop-trust-kind-badge">
      <KindIcon kind={kind} />
      {productKindLabels[kind]}
    </span>
  );
}

export type ShopStatusTone = "complete" | "pending" | "info" | "neutral";

export function ShopStatusBadge({ tone, children }: { tone: ShopStatusTone; children: React.ReactNode }) {
  return <span className={`shop-trust-status-badge shop-trust-status-badge--${tone}`}>{children}</span>;
}

export function ShopPrice({ amount, large = false }: { amount: string; large?: boolean }) {
  return (
    <p className={large ? "shop-trust-price shop-trust-price--hero" : "shop-trust-price"}>{amount}</p>
  );
}

export function shopFeedbackClass(kind: string) {
  switch (kind) {
    case "owned":
      return "shop-trust-feedback shop-trust-feedback--success";
    case "extend":
      return "shop-trust-feedback shop-trust-feedback--pending";
    default:
      return "shop-trust-feedback shop-trust-feedback--info";
  }
}
