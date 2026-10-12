import "server-only";

import { parseTossPaymentsEnv, TossPaymentsConfigError, type TossPaymentsConfig } from "@/lib/payments/toss/env";

export function getTossPaymentsConfig(): TossPaymentsConfig | null {
  return parseTossPaymentsEnv(process.env);
}

export function requireTossPaymentsConfig(): TossPaymentsConfig {
  const config = getTossPaymentsConfig();
  if (!config) {
    throw new TossPaymentsConfigError("토스페이먼츠 키가 설정되지 않았습니다.");
  }
  return config;
}

/** Public widget key. Read this from a Server Component; do not prefix it with NEXT_PUBLIC. */
export function getTossPaymentsClientKey() {
  return getTossPaymentsConfig()?.clientKey ?? null;
}
