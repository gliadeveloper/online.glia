const variants: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ARCHIVED: "bg-amber-50 text-amber-800 ring-amber-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  REFUNDED: "bg-red-50 text-red-700 ring-red-200",
  ADMIN: "bg-violet-50 text-violet-800 ring-violet-200",
  COACH: "bg-blue-50 text-blue-800 ring-blue-200",
  USER: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  DAILY_CHECKIN: "bg-sky-50 text-sky-800 ring-sky-200",
  WEEKLY_CHECKIN: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  SURVEY: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  INTAKE: "bg-orange-50 text-orange-800 ring-orange-200",
};

type StatusBadgeProps = {
  value: string;
  label?: string;
};

export function StatusBadge({ value, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        variants[value] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"
      }`}
    >
      {label ?? value}
    </span>
  );
}
