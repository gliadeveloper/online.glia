import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { applyVerifiedTossCancel, closeUnconfirmedTossPayment } from "@/lib/payments/toss/payment";
import {
  acceptTossWebhookBody,
  readPaymentStatusWebhook,
  readTossWebhookHeaders,
  redactTossWebhookPayload,
} from "@/lib/payments/toss/webhook";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function ack() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

function reject(status: 400 | 413) {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const accepted = acceptTossWebhookBody(await request.text());
  if (!accepted.ok) return reject(accepted.status);

  const delivery = readTossWebhookHeaders(request.headers);
  const paymentEvent = readPaymentStatusWebhook(accepted.payload);

  try {
    await prisma.tossWebhookEvent.create({
      data: {
        eventType: accepted.eventType,
        recognized: accepted.recognized,
        bodyHash: accepted.bodyHash,
        transmissionId: delivery.transmissionId,
        retriedCount: delivery.retriedCount,
        transmissionTime: delivery.transmissionTime,
        payload: redactTossWebhookPayload(accepted.payload) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  if (paymentEvent?.status === "CANCELED") {
    await applyVerifiedTossCancel(paymentEvent);
  }
  if (paymentEvent && (paymentEvent.status === "EXPIRED" || paymentEvent.status === "ABORTED")) {
    await closeUnconfirmedTossPayment(paymentEvent.orderId);
  }

  return ack();
}
