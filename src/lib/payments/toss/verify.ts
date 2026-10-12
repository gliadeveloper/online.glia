export const TOSS_PROVIDER = "toss";
export const TOSS_SUCCESS_PATH = "/api/payments/toss/success";
export const TOSS_FAIL_PATH = "/api/payments/toss/fail";

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;
const PAYMENT_KEY = /^[A-Za-z0-9_-]{8,200}$/;
const CANONICAL_AMOUNT = /^(0|[1-9][0-9]*)$/;
const ALREADY_PROCESSED = "ALREADY_PROCESSED_PAYMENT";

export type TossSuccessParams = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type StoredCharge = {
  total: number;
  discount: number;
  currency: string;
};

export function preparedTossProviderRef(orderId: string) {
  return `prepared:${orderId}`;
}

export function paymentGrantsAccess(environment: "TEST" | "LIVE" | null) {
  return environment === "LIVE";
}

export function isTossOrderId(value: string) {
  return ORDER_ID.test(value);
}

export function isTossPaymentKey(value: string) {
  return PAYMENT_KEY.test(value);
}

function single(params: URLSearchParams, name: string) {
  const values = params.getAll(name).map((value) => value.trim()).filter(Boolean);
  return values.length === 1 ? values[0] : null;
}

export function tossCustomerKey(userId: string) {
  const key = `glia-${userId}`;
  if (key.length < 2 || key.length > 50 || !/^[A-Za-z0-9\-_=.@]+$/.test(key) || !/[-_=.@]/.test(key)) {
    return null;
  }
  return key;
}

export function tossOrderName(title: string) {
  const name = title.replace(/\s+/g, " ").trim().slice(0, 100);
  return name || "상품";
}

export function tossFailureMessage(code: string | undefined) {
  switch (code) {
    case "PAY_PROCESS_CANCELED":
      return "결제를 취소했습니다.";
    case "PAY_PROCESS_ABORTED":
      return "결제에 실패했습니다.";
    case "REJECT_CARD_COMPANY":
      return "카드 정보를 확인해 주세요.";
    case "REJECT_CARD_PAYMENT":
      return "카드 한도가 넘었거나 잔액이 부족해 결제되지 않았습니다.";
    case "NOT_FOUND_PAYMENT_SESSION":
      return "결제 시간이 지나 승인이 만료되었습니다. 다시 결제해 주세요.";
    case "AMOUNT_MISMATCH":
      return "결제 금액이 주문과 달라 승인하지 않았습니다.";
    case "TOSS_CONFIRM_RETRYABLE":
      return "결제 승인 요청이 처리 중입니다. 잠시 후 주문을 다시 확인해 주세요.";
    case "TOSS_RATE_LIMITED":
      return "요청이 많아 잠시 후 다시 시도해 주세요.";
    case "ALREADY_OWNED":
      return "이미 보유 중인 상품이라 수강권을 다시 지급하지 않았습니다.";
    case "UNSUPPORTED_PAYMENT_METHOD":
      return "신용·체크카드 또는 간편결제만 사용할 수 있습니다.";
    default:
      return "결제가 완료되지 않았습니다.";
  }
}

const DIRECT_WINDOW_ERRORS: Record<string, string> = {
  USER_CANCEL: "결제를 취소했습니다.",
  PAYMENT_REQUEST_ABORTED: "결제 요청이 중단되었습니다.",
  NO_ACTIVE_PAYMENT_REQUEST: "진행 중인 결제가 없습니다.",
  NOT_SUPPORTED_PROMISE: "이 환경에서는 결제창을 열 수 없습니다.",
  NOT_SUPPORTED_WIDGET_KEY: "결제 키 설정을 확인해 주세요.",
  NEED_AGREEMENT_WITH_REQUIRED_TERMS: "이용약관에 동의해 주세요.",
  NOT_SELECTED_PAYMENT_METHOD: "결제수단을 선택해 주세요.",
  NEED_CARD_PAYMENT_DETAIL: "카드사를 선택해 주세요.",
  NOT_SUPPORTED_API_INDIVIDUAL_KEY: "주문서형 결제 키가 필요합니다.",
  INVALID_CLIENT_KEY: "토스페이먼츠 키 형식을 확인해 주세요.",
  INSECURE_KEY_USAGE: "결제 키 설정을 확인해 주세요.",
  INVALID_CUSTOMER_KEY: "결제 고객 정보를 확인해 주세요.",
  BELOW_ZERO_AMOUNT: "결제 금액을 확인해 주세요.",
  INVALID_AMOUNT_VALUE: "결제 금액을 확인해 주세요.",
  INVALID_AMOUNT_CURRENCY: "결제 통화를 확인해 주세요.",
  INCORRECT_SUCCESS_URL_FORMAT: "결제 완료 주소를 확인해 주세요.",
  INCORRECT_FAIL_URL_FORMAT: "결제 실패 주소를 확인해 주세요.",
  INVALID_METHOD_TRANSACTION: "이미 결제가 진행 중입니다. 잠시 후 다시 시도해 주세요.",
  INVALID_PARAMETERS: "결제 요청을 확인하지 못했습니다.",
  NOT_SUPPORTED_METHOD: "지원하지 않는 결제수단입니다.",
  V1_METHOD_NOT_SUPPORTED: "지원하지 않는 결제 요청입니다.",
  INVALID_METADATA: "결제 요청을 확인하지 못했습니다.",
  NETWORK_ERROR: "네트워크 오류가 났습니다. 잠시 후 다시 시도해 주세요.",
  UNKNOWN: "결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

function readThrownCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,80}$/.test(code) ? code : undefined;
}

/** Buyer copy for errors thrown while opening the payment widget. failUrl codes stay on tossFailureMessage. */
export function tossSdkErrorMessage(error: unknown) {
  const code = readThrownCode(error);
  if (code && DIRECT_WINDOW_ERRORS[code]) return DIRECT_WINDOW_ERRORS[code];
  if (code) {
    const known = tossFailureMessage(code);
    if (known !== "결제가 완료되지 않았습니다.") return known;
  }
  return "결제창을 열지 못했습니다.";
}

/** Widget redirects include paymentType, paymentKey, orderId, and amount. */
export function parseTossSuccessQuery(params: URLSearchParams): TossSuccessParams | null {
  const paymentType = single(params, "paymentType");
  const paymentKey = single(params, "paymentKey");
  const orderId = single(params, "orderId");
  const amountText = single(params, "amount");
  if (paymentType !== "NORMAL" || !paymentKey || !orderId || !amountText) return null;
  if (!PAYMENT_KEY.test(paymentKey) || !ORDER_ID.test(orderId) || !CANONICAL_AMOUNT.test(amountText)) {
    return null;
  }
  const amount = Number(amountText);
  if (!Number.isSafeInteger(amount)) return null;
  return { paymentKey, orderId, amount };
}

/**
 * The amount used for approval is the amount saved before the payment request.
 * Client query values are accepted only when they match that snapshot.
 */
export function chargeMismatch(stored: StoredCharge, returnedAmount: number) {
  if (stored.currency !== "KRW") return "CURRENCY_UNSUPPORTED" as const;
  if (stored.discount !== 0) return "DISCOUNT_UNSUPPORTED" as const;
  if (!Number.isSafeInteger(stored.total) || stored.total < 0) return "AMOUNT_MISMATCH" as const;
  if (returnedAmount !== stored.total) return "AMOUNT_MISMATCH" as const;
  return null;
}

export function tossReturnUrls(origin: string, environment: "test" | "live") {
  const base = origin.replace(/\/$/, "");
  if (environment === "live") {
    let parsed: URL;
    try {
      parsed = new URL(base);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:") return null;
  }
  return {
    successUrl: `${base}${TOSS_SUCCESS_PATH}`,
    failUrl: `${base}${TOSS_FAIL_PATH}`,
  };
}

type ConfirmExpectation = {
  paymentKey: string;
  orderId: string;
  amount: number;
  easyPay?: string | null;
};

export type EasyPayAmounts = {
  cardAmount: number;
  chargeAmount: number;
  discountAmount: number;
};

export type TossConfirmInterpretation =
  | {
      result: "confirmed";
      method: string | null;
      receiptUrl: string | null;
      webhookSecret: string | null;
      amounts: EasyPayAmounts | null;
    }
  | { result: "already_processed"; method: null; receiptUrl: null }
  | { result: "unsupported"; method: string | null }
  | { result: "retryable"; message: string; code: "TOSS_CONFIRM_RETRYABLE" | "TOSS_RATE_LIMITED" }
  | { result: "rejected"; code: string; message: string }
  | { result: "unverified" };

/** v1 returns the resource itself. v2 wraps it in entityBody. Unknown fields are ignored. */
export function tossResourceBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const entityBody = (body as { entityBody?: unknown }).entityBody;
  if (entityBody && typeof entityBody === "object" && !Array.isArray(entityBody)) return entityBody;
  return body;
}

/** v1 errors are `{ code, message }`. v2 errors nest them under `error`. */
export function readTossError(body: unknown): { code?: string; message?: string } {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  const nested = record.error;
  const source =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : record;
  return {
    code: typeof source.code === "string" ? source.code : undefined,
    message: typeof source.message === "string" ? source.message : undefined,
  };
}

function readString(body: unknown, key: string) {
  if (!body || typeof body !== "object" || !(key in body)) return undefined;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function paymentAgrees(body: unknown, expected: ConfirmExpectation) {
  if (!body || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  if (record.paymentKey !== expected.paymentKey) return false;
  if (record.status !== "DONE") return false;
  if ("type" in record && record.type !== "NORMAL") return false;
  if ("currency" in record && record.currency !== "KRW") return false;
  if ("orderId" in record && record.orderId !== expected.orderId) return false;
  if ("amount" in record && record.amount !== expected.amount) return false;
  if ("totalAmount" in record && record.totalAmount !== expected.amount) return false;
  return true;
}

/** Payment.secret checks a later PAYMENT_STATUS_CHANGED body. Max length is 50. */
export function readWebhookSecret(body: unknown) {
  const secret = readString(body, "secret");
  if (!secret || secret.length > 50) return null;
  return secret;
}

function readWon(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

/**
 * Card is `card.amount`. Charged account or cash balance is `easyPay.amount`.
 * Coupons, provider points, and instant discounts share `easyPay.discountAmount`.
 * The three amounts add up to `totalAmount`. Card numbers are not read.
 */
export function readEasyPayAmounts(
  body: unknown,
  totalAmount: number,
  expectedProvider: string | null,
): EasyPayAmounts | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const card = record.card;
  let cardAmount = 0;
  if (card != null) {
    if (typeof card !== "object" || Array.isArray(card)) return null;
    const amount = readWon((card as Record<string, unknown>).amount);
    if (amount === null) return null;
    cardAmount = amount;
  }

  const easyPay = record.easyPay;
  if (easyPay == null) {
    return cardAmount === totalAmount ? { cardAmount, chargeAmount: 0, discountAmount: 0 } : null;
  }
  if (typeof easyPay !== "object" || Array.isArray(easyPay)) return null;
  const provider = (easyPay as Record<string, unknown>).provider;
  if (expectedProvider && typeof provider === "string" && provider !== expectedProvider) return null;
  const chargeAmount = readWon((easyPay as Record<string, unknown>).amount);
  const discountAmount = readWon((easyPay as Record<string, unknown>).discountAmount);
  if (chargeAmount === null || discountAmount === null) return null;
  if (cardAmount + chargeAmount + discountAmount !== totalAmount) return null;
  return { cardAmount, chargeAmount, discountAmount };
}

function readReceiptUrl(body: unknown) {
  if (!body || typeof body !== "object" || !("receipt" in body)) return null;
  const receipt = (body as { receipt?: unknown }).receipt;
  if (!receipt || typeof receipt !== "object" || !("url" in receipt)) return null;
  const url = (receipt as { url?: unknown }).url;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

export function interpretTossConfirmResponse(
  status: number,
  body: unknown,
  expected: ConfirmExpectation,
): TossConfirmInterpretation {
  if (status >= 200 && status < 300) {
    const resource = tossResourceBody(body);
    if (!paymentAgrees(resource, expected)) return { result: "unverified" };
    const method = readString(resource, "method") ?? null;
    if (method !== "카드" && method !== "간편결제") return { result: "unsupported", method };
    const amounts = readEasyPayAmounts(resource, expected.amount, expected.easyPay ?? null);
    if (!amounts) return { result: "unverified" };
    return {
      result: "confirmed",
      method,
      receiptUrl: readReceiptUrl(resource),
      webhookSecret: readWebhookSecret(resource),
      amounts,
    };
  }

  const error = readTossError(body);
  const message = error.message ?? "결제 승인에 실패했습니다.";
  if (error.code === ALREADY_PROCESSED) return { result: "already_processed", method: null, receiptUrl: null };
  if (error.code === "IDEMPOTENT_REQUEST_PROCESSING") {
    return {
      result: "retryable",
      code: "TOSS_CONFIRM_RETRYABLE",
      message: "결제 승인 요청이 처리 중입니다. 잠시 후 주문을 다시 확인해 주세요.",
    };
  }
  if (status === 429) {
    return { result: "retryable", code: "TOSS_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." };
  }
  if (status >= 500) return { result: "retryable", code: "TOSS_CONFIRM_RETRYABLE", message };
  return { result: "rejected", code: error.code ?? "TOSS_CONFIRM_FAILED", message };
}
