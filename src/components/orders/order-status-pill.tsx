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
};

export function OrderStatusPill({ status }: OrderStatusPillProps) {
  const tone = toneByStatus[status];

  return (
    <StatusPill tone={tone} showCompleteIcon={status === "PAID"} className="shrink-0">
      {orderStatusLabels[status]}
    </StatusPill>
  );
}
