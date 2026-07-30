"use client";

import { TypographyScaleProvider } from "@/lib/typography";
import { TypographyDebugPanel } from "@/components/typography/typography-debug-panel";

type TypographyRootProviderProps = {
  children: React.ReactNode;
};

/** Root-level typography scale — WebView bridge + dev debug. */
export function TypographyRootProvider({ children }: TypographyRootProviderProps) {
  return (
    <TypographyScaleProvider>
      {children}
      <TypographyDebugPanel />
    </TypographyScaleProvider>
  );
}
