import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getProductPrice, grantTossOrder, revokeFulfillment } from "@/lib/fulfillment";
import { interpretTossCancelResponse } from "@/lib/payments/toss/cancel";
import { tossPaymentsFetch } from "@/lib/payments/toss/client";
import type { TossWidgetPaymentRequest } from "@/lib/payments/toss/widget";
import { requireTossPaymentsConfig } from "@/lib/payments/toss/config";
import { TossPaymentsConfigError, type TossPaymentsConfig } from "@/lib/payments/toss/env";
import {
  TOSS_PROVIDER,
  chargeMismatch,
  interpretTossConfirmResponse,
  isTossPaymentKey,
  paymentGrantsAccess,
  preparedTossProviderRef,
  tossCustomerKey,
  tossOrderName,
  tossReturnUrls,
  type TossSuccessParams,
} from "@/lib/payments/toss/verify";
import { prisma } from "@/lib/prisma";
import { assessProductCheckout } from "@/lib/shop-purchase-state";

const CHARGE_MESSAGES = {
  AMOUNT_MISMATCH: "결제 금액이 주문 금액과 다릅니다.",
  DISCOUNT_UNSUPPORTED: "할인 금액은 서버에 확정된 주문만 승인할 수 있습니다.",
  CURRENCY_UNSUPPORTED: "지원하지 않는 통화입니다.",
} as const;

function loadConfig() {
  try {
    return requireTossPaymentsConfig();
  } catch (error) {
    if (error instanceof TossPaymentsConfigError) {
      throw new ApiError(error.message, 503, error.code);
    }
    throw error;
  }
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function requestFor(params: {
  orderId: string;
  amount: number;
  orderName: string;
  customerEmail: string | null;
  customerName: string | null;
  config: TossPaymentsConfig;
  origin: string;
}): TossWidgetPaymentRequest {
  const urls = tossReturnUrls(params.origin, params.config.environment);
  if (!urls) {
    throw new ApiError("라이브 결제 리다이렉트는 HTTPS 주소여야 합니다.", 503, "TOSS_RETURN_URL_INVALID");
  }
  return {
    orderId: params.orderId,
    orderName: params.orderName,
    amount: { currency: "KRW", value: params.amount },
    successUrl: urls.successUrl,
    failUrl: urls.failUrl,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
  };
}

const productInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          defaultAccessDuration: true,
          defaultAccessDays: true,
        },
      },
      coachingOffering: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.ProductInclude;

export async function prepareTossPayment(params: {
  userId: string;
  productId: string;
  idempotencyKey?: string;
  origin: string;
}) {
  const config = loadConfig();
  if (config.keyKind !== "widget") {
    throw new ApiError("주문서형은 결제위젯 키가 필요합니다.", 503, "TOSS_WIDGET_KEY_REQUIRED");
  }

  const product = await prisma.product.findFirst({
    where: { id: params.productId, isActive: true },
    include: productInclude,
  });
  if (!product) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new ApiError("User not found", 404, "USER_NOT_FOUND");
  const customerKey = tossCustomerKey(user.id);
  if (!customerKey) throw new ApiError("구매자 키를 만들지 못했습니다.", 500, "CUSTOMER_KEY_INVALID");
  const orderName = tossOrderName(product.title);
  const customerEmail = user.email.trim() || null;
  const customerName = user.name?.trim() || null;

  const now = new Date();
  const assessment = await assessProductCheckout(params.userId, product, now);
  if (!assessment.canCheckout) {
    throw new ApiError(
      assessment.blockMessage ?? "Already owned",
      409,
      assessment.blockCode ?? "ALREADY_OWNED",
    );
  }

  const amount = getProductPrice(product);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new ApiError("결제 금액이 올바르지 않습니다.", 409, "AMOUNT_MISMATCH");
  }

  const checkout = {
    orderName,
    customerEmail,
    customerName,
    config,
    origin: params.origin,
  };

  if (params.idempotencyKey) {
    const existing = await reusableOrder(params.idempotencyKey, params.userId, params.productId, amount);
    if (existing) {
      return requestFor({ ...checkout, orderId: existing.id, amount: existing.total });
    }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: params.userId,
          status: "PENDING",
          checkout: "TOSS",
          subtotal: amount,
          discount: 0,
          total: amount,
          currency: "KRW",
          idempotencyKey: params.idempotencyKey,
          lines: {
            create: {
              productId: product.id,
              unitPrice: amount,
              lineTotal: amount,
            },
          },
        },
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          provider: TOSS_PROVIDER,
          providerRef: preparedTossProviderRef(created.id),
          amount,
          status: "PENDING",
          environment: config.environment === "test" ? "TEST" : "LIVE",
        },
      });

      return created;
    });

    return requestFor({ ...checkout, orderId: order.id, amount: order.total });
  } catch (error) {
    if (params.idempotencyKey && isUniqueConflict(error)) {
      const existing = await reusableOrder(params.idempotencyKey, params.userId, params.productId, amount);
      if (existing) {
        return requestFor({ ...checkout, orderId: existing.id, amount: existing.total });
      }
      throw new ApiError("이미 사용된 주문 키입니다.", 409, "IDEMPOTENCY_CONFLICT");
    }
    throw error;
  }
}

async function reusableOrder(idempotencyKey: string, userId: string, productId: string, amount: number) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: { lines: { select: { productId: true } }, payments: true },
  });
  if (!existing) return null;
  const payment = existing.payments.find((item) => item.provider === TOSS_PROVIDER);
  const sameSnapshot =
    existing.userId === userId &&
    existing.checkout === "TOSS" &&
    existing.status === "PENDING" &&
    existing.discount === 0 &&
    existing.currency === "KRW" &&
    existing.total === amount &&
    existing.lines.length === 1 &&
    existing.lines[0]?.productId === productId &&
    payment?.status === "PENDING" &&
    payment.providerRef === preparedTossProviderRef(existing.id) &&
    payment.amount === amount &&
    payment.easyPay == null;
  if (!sameSnapshot) {
    throw new ApiError("이미 사용된 주문 키입니다.", 409, "IDEMPOTENCY_CONFLICT");
  }
  return existing;
}

export async function confirmTossPayment(params: { userId: string; success: TossSuccessParams }) {
  const config = loadConfig();
  const { success } = params;
  const order = await prisma.order.findUnique({
    where: { id: success.orderId },
    include: { payments: true },
  });

  if (!order || order.userId !== params.userId || order.checkout !== "TOSS") {
    throw new ApiError("주문을 찾을 수 없습니다.", 404, "ORDER_NOT_FOUND");
  }

  const mismatch = chargeMismatch(order, success.amount);
  if (mismatch) throw new ApiError(CHARGE_MESSAGES[mismatch], 400, mismatch);

  const payment = order.payments.find((item) => item.provider === TOSS_PROVIDER);
  if (!payment || payment.amount !== order.total) {
    throw new ApiError("결제 요청 정보를 찾을 수 없습니다.", 409, "PAYMENT_NOT_FOUND");
  }

  const storedEnvironment = payment.environment;
  const agrees =
    (storedEnvironment === "TEST" && config.environment === "test") ||
    (storedEnvironment === "LIVE" && config.environment === "live");
  if (!agrees) {
    throw new ApiError("결제 환경이 요청 때와 다릅니다.", 409, "PAYMENT_ENVIRONMENT_MISMATCH");
  }

  if (payment.status === "SUCCEEDED" && payment.providerRef === success.paymentKey) {
    return finishConfirmedOrder(order, storedEnvironment);
  }

  if (payment.providerRef !== preparedTossProviderRef(order.id) && payment.providerRef !== success.paymentKey) {
    throw new ApiError("이미 다른 결제가 연결된 주문입니다.", 409, "PAYMENT_KEY_MISMATCH");
  }

  if (order.status !== "PENDING" || payment.status !== "PENDING") {
    throw new ApiError("승인할 수 없는 주문입니다.", 409, "INVALID_STATUS");
  }

  let interpreted = await requestConfirmation({
    paymentKey: success.paymentKey,
    orderId: order.id,
    amount: order.total,
    idempotencyKey: payment.id,
    easyPay: payment.easyPay,
  });
  if (interpreted.result === "already_processed") {
    interpreted = await loadProcessedPayment({
      paymentKey: success.paymentKey,
      orderId: order.id,
      amount: order.total,
      easyPay: payment.easyPay,
    });
  }
  if (interpreted.result === "unsupported") {
    const released = await cancelUnsupportedPayment({
      paymentKey: success.paymentKey,
      orderId: order.id,
      amount: order.total,
      idempotencyKey: `unsupported-${payment.id}`,
    });
    if (released) {
      await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "FAILED", providerRef: success.paymentKey, method: interpreted.method },
      });
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING", checkout: "TOSS" },
        data: { status: "CANCELLED" },
      });
    }
    throw new ApiError(
      "신용·체크카드 또는 간편결제만 사용할 수 있습니다.",
      released ? 400 : 503,
      released ? "UNSUPPORTED_PAYMENT_METHOD" : "TOSS_CONFIRM_RETRYABLE",
    );
  }
  if (interpreted.result === "already_processed") {
    throw new ApiError("결제 승인 응답을 확인하지 못했습니다.", 502, "TOSS_CONFIRM_UNVERIFIED");
  }

  if (interpreted.result === "retryable") {
    throw new ApiError(interpreted.message, 503, interpreted.code);
  }
  if (interpreted.result === "unverified") {
    throw new ApiError("결제 승인 응답을 확인하지 못했습니다.", 502, "TOSS_CONFIRM_UNVERIFIED");
  }
  if (interpreted.result === "rejected") {
    throw new ApiError(interpreted.message, 402, interpreted.code);
  }

  const now = new Date();
  const recorded = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      orderId: order.id,
      provider: TOSS_PROVIDER,
      status: "PENDING",
      amount: order.total,
      OR: [
        { providerRef: preparedTossProviderRef(order.id) },
        { providerRef: success.paymentKey },
      ],
    },
    data: {
      providerRef: success.paymentKey,
      status: "SUCCEEDED",
      paidAt: now,
      method: interpreted.method,
      receiptUrl: interpreted.receiptUrl,
      ...(interpreted.result === "confirmed" && interpreted.webhookSecret
        ? { webhookSecret: interpreted.webhookSecret }
        : {}),
      ...(interpreted.result === "confirmed" && interpreted.amounts
        ? {
            cardAmount: interpreted.amounts.cardAmount,
            chargeAmount: interpreted.amounts.chargeAmount,
            discountAmount: interpreted.amounts.discountAmount,
          }
        : {}),
    },
  });

  if (recorded.count !== 1) {
    const current = await prisma.payment.findUnique({ where: { id: payment.id } });
    if (current?.status !== "SUCCEEDED" || current.providerRef !== success.paymentKey) {
      throw new ApiError("결제 결과를 저장하지 못했습니다.", 409, "PAYMENT_RECORD_CONFLICT");
    }
  } else if (storedEnvironment === "TEST") {
    await writeAuditLog({
      actorId: params.userId,
      entityType: "Payment",
      entityId: payment.id,
      action: "TOSS_TEST_PAYMENT_RECORDED",
      metadata: { orderId: order.id },
    });
  }

  return finishConfirmedOrder(order, storedEnvironment);
}

async function loadProcessedPayment(expected: TossSuccessParams & { easyPay: string | null }) {
  try {
    const response = await tossPaymentsFetch(`/v1/payments/${encodeURIComponent(expected.paymentKey)}`, {
      method: "GET",
    });
    const body = await response.json().catch(() => null);
    return interpretTossConfirmResponse(response.status, body, expected);
  } catch (error) {
    if (error instanceof TossPaymentsConfigError) throw error;
    return {
      result: "retryable" as const,
      code: "TOSS_CONFIRM_RETRYABLE" as const,
      message: "결제 상태를 확인하지 못했습니다.",
    };
  }
}

async function cancelUnsupportedPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
}) {
  try {
    const response = await tossPaymentsFetch(`/v1/payments/${encodeURIComponent(params.paymentKey)}/cancel`, {
      method: "POST",
      idempotencyKey: params.idempotencyKey,
      body: { cancelReason: "지원하지 않는 결제수단", refundableAmount: params.amount },
    });
    const body = await response.json().catch(() => null);
    const interpreted = interpretTossCancelResponse(response.status, body, {
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      cancelAmount: params.amount,
      originalAmount: params.amount,
      alreadyRefunded: 0,
      knownTransactionKeys: [],
    });
    if (interpreted.result === "canceled") return true;
    return interpreted.result === "rejected" && interpreted.code === "ALREADY_CANCELED_PAYMENT";
  } catch {
    return false;
  }
}

async function requestConfirmation(expected: TossSuccessParams & { idempotencyKey: string; easyPay: string | null }) {
  try {
    const response = await tossPaymentsFetch("/v1/payments/confirm", {
      method: "POST",
      idempotencyKey: expected.idempotencyKey,
      body: {
        paymentKey: expected.paymentKey,
        orderId: expected.orderId,
        amount: expected.amount,
      },
    });
    const body = await response.json().catch(() => null);
    return interpretTossConfirmResponse(response.status, body, expected);
  } catch (error) {
    if (error instanceof TossPaymentsConfigError) throw error;
    return {
      result: "retryable" as const,
      code: "TOSS_CONFIRM_RETRYABLE" as const,
      message: "결제 승인 요청에 실패했습니다.",
    };
  }
}

async function finishConfirmedOrder(
  order: { id: string; status: "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "CANCELLED"; userId: string },
  environment: "TEST" | "LIVE" | null,
) {
  if (!paymentGrantsAccess(environment)) {
    return { orderId: order.id, granted: false as const };
  }

  if (order.status !== "PAID") {
    await grantTossOrder({ orderId: order.id, actorId: order.userId, now: new Date() });
  }

  return { orderId: order.id, granted: true as const };
}

export async function cancelTossPayment(params: {
  orderId: string;
  actorId: string;
  amount?: number;
  reason?: string;
}) {
  const config = loadConfig();
  const reason = params.reason?.trim() || "구매자가 취소를 원함";
  if (reason.length > 200) {
    throw new ApiError("취소 사유는 200자까지 입력할 수 있습니다.", 400, "CANCEL_REASON_INVALID");
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payments: true, refunds: true },
  });
  if (!order || order.checkout !== "TOSS") {
    throw new ApiError("토스 주문을 찾을 수 없습니다.", 404, "ORDER_NOT_FOUND");
  }

  const payment = order.payments.find((item) => item.provider === TOSS_PROVIDER);
  if (!payment || payment.status !== "SUCCEEDED" || !isTossPaymentKey(payment.providerRef)) {
    throw new ApiError("취소할 승인 결제가 없습니다.", 409, "PAYMENT_NOT_FOUND");
  }
  if (payment.method === "가상계좌") {
    throw new ApiError("가상계좌 환불 계좌는 이 주문에서 저장하지 않습니다.", 409, "VIRTUAL_ACCOUNT_REFUND_UNSUPPORTED");
  }

  const environment = payment.environment;
  const agrees =
    (environment === "TEST" && config.environment === "test") ||
    (environment === "LIVE" && config.environment === "live");
  if (!agrees || (environment !== "TEST" && environment !== "LIVE")) {
    throw new ApiError("결제 환경이 요청 때와 다릅니다.", 409, "PAYMENT_ENVIRONMENT_MISMATCH");
  }

  if (order.status === "REFUNDED" || order.status === "CANCELLED") {
    throw new ApiError("이미 취소된 주문입니다.", 409, "ALREADY_REFUNDED");
  }
  if (environment === "TEST" && order.status !== "PENDING") {
    throw new ApiError("테스트 결제는 결제 대기 상태에서만 취소할 수 있습니다.", 409, "INVALID_STATUS");
  }
  if (
    environment === "LIVE" &&
    order.status !== "PAID" &&
    order.status !== "PARTIALLY_REFUNDED" &&
    order.status !== "PENDING"
  ) {
    throw new ApiError("취소할 수 없는 주문입니다.", 409, "INVALID_STATUS");
  }

  const alreadyRefunded = order.refunds
    .filter((item) => item.status === "COMPLETED")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = payment.amount - alreadyRefunded;
  if (!Number.isSafeInteger(balance) || balance < 1) {
    throw new ApiError("취소할 잔액이 없습니다.", 409, "NOTHING_TO_CANCEL");
  }

  const cancelAmount = params.amount ?? balance;
  if (!Number.isSafeInteger(cancelAmount) || cancelAmount < 1 || cancelAmount > balance) {
    throw new ApiError("취소 금액이 잔액보다 큽니다.", 400, "CANCEL_AMOUNT_INVALID");
  }
  if (environment === "TEST" && cancelAmount !== balance) {
    throw new ApiError("테스트 결제는 전액만 취소할 수 있습니다.", 400, "CANCEL_AMOUNT_INVALID");
  }

  const knownTransactionKeys = order.refunds.flatMap((item) => (item.transactionKey ? [item.transactionKey] : []));
  const pending = order.refunds.find((item) => item.status === "PENDING");
  let refundId: string;
  let idempotencyKey: string;
  if (pending?.idempotencyKey) {
    if (pending.amount !== cancelAmount || (pending.reason ?? "") !== reason) {
      throw new ApiError("진행 중인 취소가 있습니다.", 409, "CANCEL_IN_PROGRESS");
    }
    refundId = pending.id;
    idempotencyKey = pending.idempotencyKey;
    const expiresAt = pending.createdAt.getTime() + 15 * 24 * 60 * 60 * 1000;
    if (Date.now() >= expiresAt) {
      idempotencyKey = randomUUID();
      await prisma.refund.update({
        where: { id: pending.id },
        data: { idempotencyKey },
      });
    }
  } else if (pending) {
    throw new ApiError("진행 중인 취소가 있습니다.", 409, "CANCEL_IN_PROGRESS");
  } else {
    const created = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: cancelAmount,
        reason,
        status: "PENDING",
        idempotencyKey: randomUUID(),
      },
    });
    refundId = created.id;
    idempotencyKey = created.idempotencyKey ?? "";
  }
  if (!/^[A-Za-z0-9-]{8,300}$/.test(idempotencyKey)) {
    throw new ApiError("취소 멱등키를 만들지 못했습니다.", 500, "IDEMPOTENCY_KEY_INVALID");
  }

  const interpreted = await requestCancellation({
    paymentKey: payment.providerRef,
    idempotencyKey,
    full: cancelAmount === balance,
    reason,
    expected: {
      paymentKey: payment.providerRef,
      orderId: order.id,
      cancelAmount,
      originalAmount: payment.amount,
      alreadyRefunded,
      knownTransactionKeys,
    },
  });

  if (interpreted.result === "retryable") {
    throw new ApiError(interpreted.message, 503, "TOSS_CANCEL_RETRYABLE");
  }
  if (interpreted.result === "unverified") {
    throw new ApiError("결제 취소 응답을 확인하지 못했습니다.", 502, "TOSS_CANCEL_UNVERIFIED");
  }
  if (interpreted.result === "rejected") {
    await prisma.refund.updateMany({
      where: { id: refundId, status: "PENDING" },
      data: { status: "FAILED" },
    });
    throw new ApiError(interpreted.message, 402, interpreted.code);
  }

  const cancel = interpreted.cancel;
  const nextStatus = cancel.balanceAmount > 0
    ? "PARTIALLY_REFUNDED"
    : environment === "TEST" && order.status === "PENDING"
      ? "CANCELLED"
      : "REFUNDED";

  try {
    await prisma.$transaction(async (tx) => {
      const recorded = await tx.refund.updateMany({
        where: { id: refundId, status: "PENDING" },
        data: {
          status: "COMPLETED",
          amount: cancel.cancelAmount,
          refundedAt: new Date(cancel.canceledAt),
          transactionKey: cancel.transactionKey,
          cancelStatus: cancel.cancelStatus,
          refundableAmount: cancel.refundableAmount,
          easyPayDiscountAmount: cancel.easyPayDiscountAmount,
          receiptKey: cancel.receiptKey,
        },
      });
      if (recorded.count !== 1) {
        throw new ApiError("취소 결과를 저장하지 못했습니다.", 409, "CANCEL_RECORD_CONFLICT");
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
      if (cancel.balanceAmount === 0) {
        await tx.payment.updateMany({
          where: { id: payment.id, status: "SUCCEEDED" },
          data: { status: "REFUNDED" },
        });
      }
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueConflict(error)) {
      throw new ApiError("이미 기록된 취소입니다.", 409, "CANCEL_ALREADY_RECORDED");
    }
    throw error;
  }

  if (environment === "LIVE" && cancel.balanceAmount === 0) {
    try {
      await revokeFulfillment({ orderId: order.id, actorId: params.actorId, reason });
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "NO_FULFILLMENT") throw error;
    }
  }

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Refund",
    entityId: refundId,
    action: "TOSS_PAYMENT_CANCELED",
    metadata: {
      orderId: order.id,
      amount: cancel.cancelAmount,
      balanceAmount: cancel.balanceAmount,
      transactionKey: cancel.transactionKey,
    },
  });
}

async function requestCancellation(params: {
  paymentKey: string;
  idempotencyKey: string;
  full: boolean;
  reason: string;
  expected: {
    paymentKey: string;
    orderId: string;
    cancelAmount: number;
    originalAmount: number;
    alreadyRefunded: number;
    knownTransactionKeys: string[];
  };
}) {
  try {
    const response = await tossPaymentsFetch(`/v1/payments/${params.paymentKey}/cancel`, {
      method: "POST",
      idempotencyKey: params.idempotencyKey,
      body: {
        cancelReason: params.reason,
        refundableAmount: params.expected.originalAmount - params.expected.alreadyRefunded,
        ...(params.full ? {} : { cancelAmount: params.expected.cancelAmount }),
      },
    });
    const body = await response.json().catch(() => null);
    return interpretTossCancelResponse(response.status, body, params.expected);
  } catch (error) {
    if (error instanceof TossPaymentsConfigError) throw error;
    return { result: "retryable" as const, message: "결제 취소 요청에 실패했습니다." };
  }
}

function secretsMatch(stored: string, given: string) {
  const left = Buffer.from(stored);
  const right = Buffer.from(given);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A dashboard cancel is a PAYMENT_STATUS_CHANGED with status CANCELED.
 * It updates the order only when data.secret matches the confirm response.
 * DONE still does not grant access.
 */
export async function applyVerifiedTossCancel(event: {
  orderId: string;
  paymentKey: string;
  secret: string | null;
  balanceAmount: number | null;
}) {
  if (!event.secret || event.balanceAmount !== 0) return;

  const order = await prisma.order.findUnique({
    where: { id: event.orderId },
    include: { payments: true, refunds: true },
  });
  if (!order || order.checkout !== "TOSS") return;
  if (order.status === "REFUNDED" || order.status === "CANCELLED") return;
  if (order.refunds.some((item) => item.status === "PENDING")) return;

  const payment = order.payments.find((item) => item.provider === TOSS_PROVIDER && item.providerRef === event.paymentKey);
  if (!payment || payment.status !== "SUCCEEDED" || !payment.webhookSecret) return;
  if (!secretsMatch(payment.webhookSecret, event.secret)) return;
  if (payment.environment === "TEST" && order.status !== "PENDING") return;
  if (
    payment.environment === "LIVE" &&
    order.status !== "PAID" &&
    order.status !== "PARTIALLY_REFUNDED" &&
    order.status !== "PENDING"
  ) {
    return;
  }

  const alreadyRefunded = order.refunds
    .filter((item) => item.status === "COMPLETED")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = payment.amount - alreadyRefunded;
  if (!Number.isSafeInteger(balance) || balance < 1) return;

  const nextStatus = payment.environment === "TEST" && order.status === "PENDING" ? "CANCELLED" : "REFUNDED";
  const recorded = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: "SUCCEEDED",
        providerRef: event.paymentKey,
        webhookSecret: event.secret,
      },
      data: { status: "REFUNDED" },
    });
    if (updated.count !== 1) return false;
    await tx.refund.create({
      data: {
        orderId: order.id,
        amount: balance,
        reason: "토스페이먼츠에서 결제 취소",
        status: "COMPLETED",
        refundedAt: new Date(),
        cancelStatus: "DONE",
        refundableAmount: 0,
      },
    });
    const orderUpdated = await tx.order.updateMany({
      where: { id: order.id, status: order.status, checkout: "TOSS" },
      data: { status: nextStatus },
    });
    if (orderUpdated.count !== 1) {
      throw new Error("주문 상태가 바뀌어 웹훅 취소를 저장하지 못했습니다.");
    }
    return true;
  });
  if (!recorded || payment.environment !== "LIVE") return;

  try {
    await revokeFulfillment({
      orderId: order.id,
      actorId: order.userId,
      reason: "토스페이먼츠에서 결제 취소",
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "NO_FULFILLMENT") throw error;
  }
}

/** EXPIRED and ABORTED close an unconfirmed checkout. A confirmed payment is left unchanged. */
export async function closeUnconfirmedTossPayment(orderId: string) {
  const prepared = preparedTossProviderRef(orderId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order || order.checkout !== "TOSS" || order.status !== "PENDING") return;

  const payment = order.payments.find((item) => item.provider === TOSS_PROVIDER && item.status === "PENDING");
  if (!payment || payment.providerRef !== prepared) return;

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING", providerRef: prepared },
      data: { status: "FAILED" },
    }),
    prisma.order.updateMany({
      where: { id: order.id, status: "PENDING", checkout: "TOSS" },
      data: { status: "CANCELLED" },
    }),
  ]);
}
