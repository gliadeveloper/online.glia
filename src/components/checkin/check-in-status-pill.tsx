import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";

type CheckInStatusPillProps = {
  done: boolean;
  pendingLabel?: string;
  doneLabel?: string;
};

export function CheckInStatusPill({
  done,
  pendingLabel = "미기록",
  doneLabel = "기록 완료",
}: CheckInStatusPillProps) {
  const tone: StatusPillTone = done ? "complete" : "pending";

  return (
    <StatusPill tone={tone} showCompleteIcon={done}>
      {done ? doneLabel : pendingLabel}
    </StatusPill>
  );
}
