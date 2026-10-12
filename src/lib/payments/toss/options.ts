import "server-only";

import { getTossPaymentsConfig } from "@/lib/payments/toss/config";
import { TossPaymentsConfigError } from "@/lib/payments/toss/env";
import type { WidgetCheckoutOptions } from "@/lib/payments/toss/widget";

export type { WidgetCheckoutOptions };

export function listWidgetCheckoutOptions(): WidgetCheckoutOptions {
  try {
    const config = getTossPaymentsConfig();
    if (!config) return { state: "off" };
    if (config.keyKind !== "widget") {
      return { state: "unavailable", message: "주문서형은 결제위젯 키가 필요합니다." };
    }
    return { state: "ready", clientKey: config.clientKey, variantKey: config.variantKey };
  } catch (error) {
    if (error instanceof TossPaymentsConfigError) {
      return { state: "unavailable", message: error.message };
    }
    throw error;
  }
}
