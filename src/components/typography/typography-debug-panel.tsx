"use client";

import { useState } from "react";
import { IOS_SCALE_STEPS, useTypographyScale } from "@/lib/typography";
import type { TypographyScaleConfig } from "@/lib/typography";

function isDebugVisible(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.search.includes("typography-debug=1") ||
    localStorage.getItem("glia-typography-debug") !== null
  );
}

/**
 * Dev-only typography scale simulator.
 * Visible when `?typography-debug=1` or `localStorage.glia-typography-debug` is set.
 */
export function TypographyDebugPanel() {
  const { config, setConfig } = useTypographyScale();
  const [visible] = useState(isDebugVisible);

  if (process.env.NODE_ENV === "production" || !visible) return null;

  const persist = (next: TypographyScaleConfig) => {
    setConfig(next);
    localStorage.setItem("glia-typography-debug", JSON.stringify(next));
  };

  return (
    <div
      className="fixed bottom-20 right-4 z-[200] max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm lg:bottom-4"
      aria-label="Typography debug"
    >
      <p className="typo-subTypography12 font-semibold text-[var(--color-text-primary)]">
        Typography debug
      </p>
      <label className="mt-2 block typo-subTypography12 text-[var(--color-text-secondary)]">
        Platform
        <select
          className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 typo-subTypography12"
          value={config.platform}
          onChange={(e) =>
            persist({
              ...config,
              platform: e.target.value as TypographyScaleConfig["platform"],
            })
          }
        >
          <option value="web">web</option>
          <option value="ios">ios</option>
          <option value="android">android</option>
        </select>
      </label>
      {config.platform === "ios" ? (
        <label className="mt-2 block typo-subTypography12 text-[var(--color-text-secondary)]">
          iOS step
          <select
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 typo-subTypography12"
            value={config.scaleStep ?? "100%"}
            onChange={(e) =>
              persist({
                ...config,
                scaleStep: e.target.value as TypographyScaleConfig["scaleStep"],
              })
            }
          >
            {IOS_SCALE_STEPS.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="mt-2 block typo-subTypography12 text-[var(--color-text-secondary)]">
          Scale %
          <input
            type="range"
            min={100}
            max={310}
            step={5}
            value={config.scalePercent}
            className="mt-1 w-full"
            onChange={(e) =>
              persist({ ...config, scalePercent: Number(e.target.value) })
            }
          />
          <span className="typo-subTypography13">{config.scalePercent}%</span>
        </label>
      )}
    </div>
  );
}
