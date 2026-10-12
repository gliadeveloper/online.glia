import { createHash } from "node:crypto";

/** Public path registered per MID in the Toss developer center. */
export const TOSS_WEBHOOK_PATH = "/api/payments/toss/webhook";

/** Toss marks the delivery successful only after HTTP 200 within this budget. */
export const TOSS_WEBHOOK_ACK_MS = 10_000;

export const TOSS_WEBHOOK_MAX_BYTES = 256 * 1024;

/** Event names from the webhook connection guide. Bodies are documented separately. */
export const TOSS_WEBHOOK_EVENT_TYPES = [
  "PAYMENT_STATUS_CHANGED",
  "DEPOSIT_CALLBACK",
  "CANCEL_STATUS_CHANGED",
  "METHOD_UPDATED",
  "CUSTOMER_STATUS_CHANGED",
  "payout.changed",
  "seller.changed",
  "BILLING_DELETED",
  "ORDER_PAYMENT_STATUS_CHANGED",
  "ars-reservation.changed",
] as const;

export type TossWebhookEventType = (typeof TOSS_WEBHOOK_EVENT_TYPES)[number];

const EVENT_TYPE_TOKEN = /^[A-Za-z0-9_.-]{1,80}$/;
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set(TOSS_WEBHOOK_EVENT_TYPES);

export type TossWebhookAcceptance =
  | {
      ok: true;
      eventType: string | null;
      recognized: boolean;
      bodyHash: string;
      payload: Record<string, unknown>;
    }
  | { ok: false; status: 400 | 413 };

export function acceptTossWebhookBody(raw: string): TossWebhookAcceptance {
  if (Buffer.byteLength(raw, "utf8") > TOSS_WEBHOOK_MAX_BYTES) {
    return { ok: false, status: 413 };
  }
  if (!raw.trim()) return { ok: false, status: 400 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400 };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, status: 400 };
  }

  const eventType = readEventType(parsed);
  return {
    ok: true,
    eventType,
    recognized: eventType != null && KNOWN_EVENT_TYPES.has(eventType),
    bodyHash: createHash("sha256").update(raw).digest("hex"),
    payload: parsed as Record<string, unknown>,
  };
}

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;
const PAYMENT_KEY = /^[A-Za-z0-9_-]{8,200}$/;
const TRANSMISSION_ID = /^[A-Za-z0-9_-]{8,80}$/;

/** Statuses that send PAYMENT_STATUS_CHANGED. Closing the window does not. */
const PAYMENT_WEBHOOK_STATUSES = ["EXPIRED", "DONE", "ABORTED", "CANCELED", "PARTIAL_CANCELED"] as const;

export type PaymentStatusWebhook = {
  orderId: string;
  paymentKey: string;
  status: (typeof PAYMENT_WEBHOOK_STATUSES)[number];
  secret: string | null;
  balanceAmount: number | null;
};

export function readTossWebhookHeaders(headers: Headers) {
  const transmissionId = headers.get("tosspayments-webhook-transmission-id")?.trim() ?? "";
  const retried = headers.get("tosspayments-webhook-transmission-retried-count")?.trim() ?? "";
  const transmissionTime = headers.get("tosspayments-webhook-transmission-time")?.trim() ?? "";
  return {
    transmissionId: TRANSMISSION_ID.test(transmissionId) ? transmissionId : null,
    retriedCount: /^(0|[1-9][0-9]{0,2})$/.test(retried) ? Number(retried) : null,
    transmissionTime: transmissionTime.length > 0 && transmissionTime.length <= 40 ? transmissionTime : null,
  };
}

/** Card numbers and webhook secrets are not kept. The raw hash still dedupes retries. */
export function redactTossWebhookPayload(payload: Record<string, unknown>) {
  const copy = structuredClone(payload);
  if (typeof copy.secret === "string") copy.secret = null;
  const data = copy.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return copy;
  const record = data as Record<string, unknown>;
  if (typeof record.secret === "string") record.secret = null;
  const card = record.card;
  if (card && typeof card === "object" && !Array.isArray(card) && "number" in card) {
    (card as Record<string, unknown>).number = null;
  }
  return copy;
}

export function readPaymentStatusWebhook(payload: Record<string, unknown>): PaymentStatusWebhook | null {
  if (payload.eventType !== "PAYMENT_STATUS_CHANGED") return null;
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.orderId !== "string" || !ORDER_ID.test(record.orderId)) return null;
  if (typeof record.paymentKey !== "string" || !PAYMENT_KEY.test(record.paymentKey)) return null;
  if (typeof record.status !== "string" || !PAYMENT_WEBHOOK_STATUSES.includes(record.status as PaymentStatusWebhook["status"])) {
    return null;
  }
  const secret = typeof record.secret === "string" && record.secret.length > 0 && record.secret.length <= 50
    ? record.secret
    : null;
  const balanceAmount = typeof record.balanceAmount === "number" && Number.isSafeInteger(record.balanceAmount) && record.balanceAmount >= 0
    ? record.balanceAmount
    : null;
  return {
    orderId: record.orderId,
    paymentKey: record.paymentKey,
    status: record.status as PaymentStatusWebhook["status"],
    secret,
    balanceAmount,
  };
}

function readEventType(body: object) {
  if (!("eventType" in body)) return null;
  const value = (body as { eventType?: unknown }).eventType;
  if (typeof value !== "string" || !EVENT_TYPE_TOKEN.test(value)) return null;
  return value;
}
