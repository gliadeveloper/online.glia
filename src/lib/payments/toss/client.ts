import "server-only";

import { requireTossPaymentsConfig } from "@/lib/payments/toss/config";
import { tossApiUrl, tossAuthorizationHeader, tossTestCodeHeader } from "@/lib/payments/toss/env";

type TossPaymentsRequest = {
  method: "GET" | "POST";
  body?: unknown;
  /** Reproduces a live error in the test environment. Ignored unless the secret key is a test key. */
  testCode?: string;
  /** Toss retries this exact cancel instead of creating another one. */
  idempotencyKey?: string;
  signal?: AbortSignal;
};

/**
 * Every Toss Payments call goes through this gate:
 * HTTPS origin only, Basic auth with the server secret, no cached responses,
 * and TossPayments-Test-Code only for a test secret key.
 */
export function tossPaymentsFetch(path: string, request: TossPaymentsRequest) {
  const config = requireTossPaymentsConfig();
  const headers = new Headers({
    Authorization: tossAuthorizationHeader(config.secretKey),
  });
  const testCode = tossTestCodeHeader(config, request.testCode)["TossPayments-Test-Code"];
  if (testCode) headers.set("TossPayments-Test-Code", testCode);
  if (request.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (request.idempotencyKey) {
    headers.set("Idempotency-Key", request.idempotencyKey);
  }

  return fetch(tossApiUrl(path), {
    method: request.method,
    headers,
    body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
    redirect: "error",
    cache: "no-store",
    signal: request.signal,
  });
}
