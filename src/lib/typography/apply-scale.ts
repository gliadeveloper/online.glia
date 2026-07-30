import {
  TYPOGRAPHY_VARIANTS,
  cssVarName,
  type TypographyVariant,
} from "./tokens";
import {
  DEFAULT_TYPOGRAPHY_SCALE,
  resolveAllTypographySizes,
  type TypographyScaleConfig,
} from "./scale";

const SCALE_PERCENT_VAR = "--typo-scale-percent";
const PLATFORM_VAR = "--typo-platform";
const SCALE_STEP_VAR = "--typo-scale-step";

export function applyTypographyScale(config: TypographyScaleConfig = DEFAULT_TYPOGRAPHY_SCALE): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const resolved = resolveAllTypographySizes(config);

  root.style.setProperty(SCALE_PERCENT_VAR, String(config.scalePercent));
  root.style.setProperty(PLATFORM_VAR, config.platform);
  root.style.setProperty(SCALE_STEP_VAR, config.scaleStep ?? "100%");
  root.dataset.typographyPlatform = config.platform;
  root.dataset.typographyScaleStep = config.scaleStep ?? "100%";

  for (const variant of TYPOGRAPHY_VARIANTS) {
    const { fontSize, lineHeight } = resolved[variant];
    root.style.setProperty(cssVarName(variant, "size"), `${fontSize}px`);
    root.style.setProperty(cssVarName(variant, "line-height"), `${lineHeight}px`);
  }
}

export function getTypographyCSSValue(variant: TypographyVariant): {
  fontSize: string;
  lineHeight: string;
} {
  return {
    fontSize: `var(${cssVarName(variant, "size")})`,
    lineHeight: `var(${cssVarName(variant, "line-height")})`,
  };
}

/** Seed :root defaults at 100% — used in globals.css generation and SSR fallback. */
export function buildDefaultCssVariableBlock(): string {
  const config = DEFAULT_TYPOGRAPHY_SCALE;
  const resolved = resolveAllTypographySizes(config);
  const lines: string[] = [":root {"];

  lines.push(`  ${SCALE_PERCENT_VAR}: 100;`);
  lines.push(`  ${PLATFORM_VAR}: web;`);
  lines.push(`  ${SCALE_STEP_VAR}: "100%";`);

  for (const variant of TYPOGRAPHY_VARIANTS) {
    const { fontSize, lineHeight } = resolved[variant];
    lines.push(`  ${cssVarName(variant, "size")}: ${fontSize}px;`);
    lines.push(`  ${cssVarName(variant, "line-height")}: ${lineHeight}px;`);
  }

  lines.push("}");
  return lines.join("\n");
}
