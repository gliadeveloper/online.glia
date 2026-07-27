import Link from "next/link";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: "default" | "emerald" | "amber" | "violet";
};

const accents = {
  default: "border-zinc-200 bg-white",
  emerald: "border-emerald-200 bg-emerald-50/50",
  amber: "border-amber-200 bg-amber-50/50",
  violet: "border-violet-200 bg-violet-50/50",
};

export function StatCard({ label, value, hint, href, accent = "default" }: StatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </>
  );

  const className = `rounded-2xl border p-5 shadow-sm transition ${accents[accent]} ${
    href ? "hover:border-zinc-300 hover:shadow-md" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
