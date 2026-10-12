import type { OrderStatus } from "@/generated/prisma/client";

import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";
import { orderStatusLabels } from "@/lib/customer-labels";

const toneByStatus: Record<OrderStatus, StatusPillTone> = {
  PENDING: "pending",
  PAID: "complete",
  PARTIALLY_REFUNDED: "info",
  REFUNDED: "neutral",
  CANCELLED: "neutral",
};

type OrderStatusPillProps = {
  status: OrderStatus;
  label?: string;
  variant?: "default" | "glia";
};

export function OrderStatusPill({ status, label, variant = "default" }: OrderStatusPillProps) {
  const tone = toneByStatus[status];
  const text = label ?? orderStatusLabels[status];

  if (variant === "glia") {
    return <span className={`glia-orders__status glia-orders__status--${tone}`}>{text}</span>;
  }

  return (
    <StatusPill tone={tone} showCompleteIcon={status === "PAID"} className="shrink-0">
      {text}
    </StatusPill>
  );
}
