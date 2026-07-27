import type { ProgressStatus } from "@/generated/prisma/client";
import { progressStatusLabels } from "@/lib/customer-labels";

const styles: Record<ProgressStatus, string> = {
  NOT_STARTED: "bg-zinc-100 text-zinc-600",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

type ProgressPillProps = {
  status: ProgressStatus;
};

export function ProgressPill({ status }: ProgressPillProps) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {progressStatusLabels[status]}
    </span>
  );
}
