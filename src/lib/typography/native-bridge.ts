import type { IosScaleStep } from "./tokens";
import { applyTypographyScale } from "./apply-scale";
import type { TypographyPlatform, TypographyScaleConfig } from "./scale";

export const NATIVE_TYPOGRAPHY_MESSAGE = "GLIA_TYPOGRAPHY_SCALE" as const;
export const TYPOGRAPHY_DEBUG_STORAGE_KEY = "glia-typography-debug" as const;

export type NativeTypographyPayload = {
  platform: Exclude<TypographyPlatform, "web">;
  scalePercent?: number;
  scaleStep?: IosScaleStep;
};

declare global {
  interface Window {
    __GLIA_TYPOGRAPHY__?: NativeTypographyPayload;
    __GLIA_APPLY_TYPOGRAPHY__?: (payload: NativeTypographyPayload) => void;
  }
}

export function payloadToScaleConfig(payload: NativeTypographyPayload): TypographyScaleConfig {
  if (payload.platform === "ios") {
    return {
      platform: "ios",
      scalePercent: payload.scalePercent ?? 100,
      scaleStep: payload.scaleStep ?? "100%",
    };
  }

  return {
    platform: "android",
    scalePercent: payload.scalePercent ?? 100,
  };
}

export function applyNativeTypographyPayload(payload: NativeTypographyPayload): void {
  applyTypographyScale(payloadToScaleConfig(payload));
}

export function readDebugTypographyConfig(): TypographyScaleConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(TYPOGRAPHY_DEBUG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TypographyScaleConfig;
    if (!parsed?.platform || typeof parsed.scalePercent !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function installNativeTypographyBridge(
  onScale?: (config: TypographyScaleConfig) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const apply = (payload: NativeTypographyPayload) => {
    const config = payloadToScaleConfig(payload);
    applyTypographyScale(config);
    onScale?.(config);
  };

  window.__GLIA_APPLY_TYPOGRAPHY__ = apply;

  if (window.__GLIA_TYPOGRAPHY__) {
    apply(window.__GLIA_TYPOGRAPHY__);
  }

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== NATIVE_TYPOGRAPHY_MESSAGE) return;
    if (!data.payload?.platform) return;
    apply(data.payload as NativeTypographyPayload);
  };

  window.addEventListener("message", onMessage);

  return () => {
    window.removeEventListener("message", onMessage);
    delete window.__GLIA_APPLY_TYPOGRAPHY__;
  };
}
