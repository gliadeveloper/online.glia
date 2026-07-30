import type { ProgressStatus } from "@/generated/prisma/client";

import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";
import { progressStatusLabels } from "@/lib/customer-labels";

const toneByStatus: Record<ProgressStatus, StatusPillTone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "pending",
  COMPLETED: "complete",
};

type ProgressStatusPillProps = {
  status: ProgressStatus;
};

export function ProgressStatusPill({ status }: ProgressStatusPillProps) {
  const tone = toneByStatus[status];

  return (
    <StatusPill tone={tone} showCompleteIcon={status === "COMPLETED"} className="shrink-0">
      {progressStatusLabels[status]}
    </StatusPill>
  );
}
