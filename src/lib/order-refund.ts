import "server-only";

import { ApiError } from "@/lib/api";
import { processRefund } from "@/lib/fulfillment";
import { cancelTossPayment } from "@/lib/payments/toss/payment";
import { prisma } from "@/lib/prisma";

type TossCancelOrder = {
  checkout: string;
  status: string;
  payments: Array<{
    provider: string;
    status: string;
    providerRef: string;
    environment: "TEST" | "LIVE" | null;
    amount: number;
  }>;
  refunds: Array<{ status: string; amount: number }>;
};

/** Same cancel box rules for admin and coach order pages. */
export function tossCancelOffer(order: TossCancelOrder) {
  const payment = order.payments.find(
    (item) => item.provider === "toss" && item.status === "SUCCEEDED" && !item.providerRef.startsWith("prepared:"),
  );
  const refunded = order.refunds
    .filter((refund) => refund.status === "COMPLETED")
    .reduce((sum, refund) => sum + refund.amount, 0);
  const balance = payment ? payment.amount - refunded : 0;
  const environment = payment?.environment;
  if (order.checkout !== "TOSS" || !environment || balance <= 0) return null;
  const open =
    environment === "TEST"
      ? order.status === "PENDING"
      : order.status === "PAID" || order.status === "PARTIALLY_REFUNDED" || order.status === "PENDING";
  if (!open) return null;
  return { balance, environment };
}

export async function refundOrder(params: {
  orderId: string;
  actorId: string;
  amount?: number;
  reason?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { checkout: true },
  });
  if (!order) throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");

  if (order.checkout === "TOSS") {
    await cancelTossPayment({
      orderId: params.orderId,
      actorId: params.actorId,
      amount: params.amount,
      reason: params.reason,
    });
    return { ok: true as const };
  }

  return processRefund({
    orderId: params.orderId,
    actorId: params.actorId,
    amount: params.amount,
    reason: params.reason,
  });
}
