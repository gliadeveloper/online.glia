import Link from "next/link";

import { AuthPageCard } from "@/components/auth/corporate-trust/auth-page-card";

type SignupStepCardProps = {
  title: string;
  titleAccent?: string;
  description?: string;
  backHref?: string;
  children: React.ReactNode;
};

export function SignupBackLink({ href, label = "뒤로" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="auth-trust-focus group mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-violet-600"
    >
      <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
      {label}
    </Link>
  );
}

export function SignupStepCard({
  title,
  titleAccent,
  description = "",
  backHref,
  children,
}: SignupStepCardProps) {
  return (
    <>
      {backHref ? <SignupBackLink href={backHref} /> : null}
      <AuthPageCard title={title} titleAccent={titleAccent} description={description}>
        {children}
      </AuthPageCard>
    </>
  );
}

export function SignupSuspenseFallback() {
  return (
    <div className="mx-auto h-48 w-full max-w-md animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />
  );
}
