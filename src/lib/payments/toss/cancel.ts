import { readTossError, tossResourceBody } from "@/lib/payments/toss/verify";

const TRANSACTION_KEY = /^[A-Za-z0-9]{8,64}$/;
const RECEIPT_KEY = /^[A-Za-z0-9]{8,100}$/;

export type TossCancelExpectation = {
  paymentKey: string;
  orderId: string;
  cancelAmount: number;
  originalAmount: number;
  alreadyRefunded: number;
  knownTransactionKeys: readonly string[];
};

export type TossCancelRecord = {
  transactionKey: string;
  cancelAmount: number;
  cancelStatus: "DONE";
  refundableAmount: number;
  balanceAmount: number;
  paymentStatus: "CANCELED" | "PARTIAL_CANCELED";
  canceledAt: string;
  easyPayDiscountAmount: number | null;
  receiptKey: string | null;
};

export type TossCancelInterpretation =
  | { result: "canceled"; cancel: TossCancelRecord }
  | { result: "retryable"; message: string }
  | { result: "rejected"; code: string; message: string }
  | { result: "unverified" };

export function interpretTossCancelResponse(
  status: number,
  body: unknown,
  expected: TossCancelExpectation,
): TossCancelInterpretation {
  if (status >= 200 && status < 300) {
    const cancel = readCanceledPayment(tossResourceBody(body), expected);
    return cancel ? { result: "canceled", cancel } : { result: "unverified" };
  }

  const error = readTossError(body);
  if (error.code === "IDEMPOTENT_REQUEST_PROCESSING") {
    return { result: "retryable", message: "이전 취소 요청이 처리 중입니다. 같은 요청으로 다시 시도해 주세요." };
  }
  if (status === 429) {
    return { result: "retryable", message: "요청이 많아 잠시 후 다시 시도해 주세요." };
  }
  if (status >= 500) {
    return { result: "retryable", message: error.message ?? "결제 취소 요청에 실패했습니다." };
  }
  return {
    result: "rejected",
    code: error.code ?? "TOSS_CANCEL_FAILED",
    message: error.message ?? "결제 취소에 실패했습니다.",
  };
}

function readCanceledPayment(body: unknown, expected: TossCancelExpectation): TossCancelRecord | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (record.paymentKey !== expected.paymentKey) return null;
  if ("orderId" in record && record.orderId !== expected.orderId) return null;
  if ("currency" in record && record.currency !== "KRW") return null;
  if ("totalAmount" in record && record.totalAmount !== expected.originalAmount) return null;
  if (typeof record.balanceAmount !== "number" || !Number.isSafeInteger(record.balanceAmount)) return null;
  if (record.balanceAmount < 0) return null;

  const remaining = expected.originalAmount - expected.alreadyRefunded - expected.cancelAmount;
  if (remaining < 0 || record.balanceAmount !== remaining) return null;
  const paymentStatus = remaining === 0 ? "CANCELED" : "PARTIAL_CANCELED";
  if (record.status !== paymentStatus) return null;

  const match = matchingCancel(record.cancels, expected);
  if (!match) return null;
  if (match.refundableAmount !== record.balanceAmount) return null;
  return {
    transactionKey: match.transactionKey,
    cancelAmount: match.cancelAmount,
    cancelStatus: "DONE",
    refundableAmount: match.refundableAmount,
    balanceAmount: record.balanceAmount,
    paymentStatus,
    canceledAt: match.canceledAt,
    easyPayDiscountAmount: match.easyPayDiscountAmount,
    receiptKey: match.receiptKey,
  };
}

function matchingCancel(value: unknown, expected: TossCancelExpectation) {
  if (!Array.isArray(value)) return null;
  const known = new Set(expected.knownTransactionKeys);
  const matches = value.flatMap((item) => {
    const cancel = readCancel(item);
    if (!cancel || known.has(cancel.transactionKey)) return [];
    if (cancel.cancelAmount !== expected.cancelAmount) return [];
    return [cancel];
  });
  return matches.length === 1 ? matches[0] : null;
}

function readCancel(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.transactionKey !== "string" || !TRANSACTION_KEY.test(record.transactionKey)) return null;
  if (record.cancelStatus !== "DONE") return null;
  if (typeof record.cancelAmount !== "number" || !Number.isSafeInteger(record.cancelAmount) || record.cancelAmount < 1) {
    return null;
  }
  if (typeof record.refundableAmount !== "number" || !Number.isSafeInteger(record.refundableAmount) || record.refundableAmount < 0) {
    return null;
  }
  if (typeof record.canceledAt !== "string" || Number.isNaN(Date.parse(record.canceledAt))) return null;
  const receiptKey = typeof record.receiptKey === "string" && RECEIPT_KEY.test(record.receiptKey) ? record.receiptKey : null;
  const discount = record.easyPayDiscountAmount;
  const easyPayDiscountAmount = typeof discount === "number" && Number.isSafeInteger(discount) ? discount : null;
  return {
    transactionKey: record.transactionKey,
    cancelAmount: record.cancelAmount,
    refundableAmount: record.refundableAmount,
    canceledAt: record.canceledAt,
    receiptKey,
    easyPayDiscountAmount,
  };
}
