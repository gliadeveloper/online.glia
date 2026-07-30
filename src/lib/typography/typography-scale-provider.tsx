"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyTypographyScale } from "./apply-scale";
import {
  DEFAULT_TYPOGRAPHY_SCALE,
  type TypographyScaleConfig,
} from "./scale";
import {
  installNativeTypographyBridge,
  readDebugTypographyConfig,
} from "./native-bridge";

type TypographyScaleContextValue = {
  config: TypographyScaleConfig;
  setConfig: (config: TypographyScaleConfig) => void;
};

const TypographyScaleContext = createContext<TypographyScaleContextValue | null>(null);

function resolveInitialConfig(): TypographyScaleConfig {
  if (typeof window === "undefined") return DEFAULT_TYPOGRAPHY_SCALE;

  if (window.__GLIA_TYPOGRAPHY__) {
    const payload = window.__GLIA_TYPOGRAPHY__;
    return payload.platform === "ios"
      ? {
          platform: "ios",
          scalePercent: payload.scalePercent ?? 100,
          scaleStep: payload.scaleStep ?? "100%",
        }
      : {
          platform: "android",
          scalePercent: payload.scalePercent ?? 100,
        };
  }

  return readDebugTypographyConfig() ?? DEFAULT_TYPOGRAPHY_SCALE;
}

type TypographyScaleProviderProps = {
  children: ReactNode;
  initialConfig?: TypographyScaleConfig;
};

export function TypographyScaleProvider({
  children,
  initialConfig,
}: TypographyScaleProviderProps) {
  const [config, setConfig] = useState<TypographyScaleConfig>(
    () => initialConfig ?? resolveInitialConfig(),
  );

  useEffect(() => {
    applyTypographyScale(config);
  }, [config]);

  useEffect(() => {
    return installNativeTypographyBridge(setConfig);
  }, []);

  const value = useMemo(
    () => ({ config, setConfig }),
    [config],
  );

  return (
    <TypographyScaleContext.Provider value={value}>
      {children}
    </TypographyScaleContext.Provider>
  );
}

export function useTypographyScale(): TypographyScaleContextValue {
  const ctx = useContext(TypographyScaleContext);
  if (!ctx) {
    throw new Error("useTypographyScale must be used within TypographyScaleProvider");
  }
  return ctx;
}

export function useOptionalTypographyScale(): TypographyScaleContextValue | null {
  return useContext(TypographyScaleContext);
}
