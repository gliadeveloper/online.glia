import {
  IOS_FONT_SIZE_TABLE,
  TYPOGRAPHY_TOKENS,
  TYPOGRAPHY_VARIANTS,
  type IosScaleStep,
  type TypographyVariant,
} from "./tokens";

export type TypographyPlatform = "ios" | "android" | "web";

export type TypographyScaleConfig = {
  platform: TypographyPlatform;
  /** Android: arbitrary percentage. Web dev simulation. */
  scalePercent: number;
  /** iOS: discrete Dynamic Type step — takes precedence on iOS. */
  scaleStep?: IosScaleStep;
};

export const DEFAULT_TYPOGRAPHY_SCALE: TypographyScaleConfig = {
  platform: "web",
  scalePercent: 100,
  scaleStep: "100%",
};

export type ResolvedTypography = {
  fontSize: number;
  lineHeight: number;
};

/** Proportional line-height when font-size changes under accessibility scaling. */
export function scaleLineHeight(
  baseFontSize: number,
  baseLineHeight: number,
  scaledFontSize: number,
): number {
  const ratio = scaledFontSize / baseFontSize;
  return Math.round(baseLineHeight * ratio * 10) / 10;
}

export function resolveTypographySize(
  variant: TypographyVariant,
  config: TypographyScaleConfig,
): ResolvedTypography {
  const base = TYPOGRAPHY_TOKENS[variant];

  if (config.platform === "ios" && config.scaleStep) {
    const fontSize = IOS_FONT_SIZE_TABLE[config.scaleStep][variant];
    return {
      fontSize,
      lineHeight: scaleLineHeight(base.fontSize, base.lineHeight, fontSize),
    };
  }

  if (config.platform === "android" || config.scalePercent !== 100) {
    const fontSize = Math.min(
      Math.round(base.fontSize * config.scalePercent * 0.01),
      base.maxFontSize,
    );
    return {
      fontSize,
      lineHeight: scaleLineHeight(base.fontSize, base.lineHeight, fontSize),
    };
  }

  return { fontSize: base.fontSize, lineHeight: base.lineHeight };
}

export function resolveAllTypographySizes(
  config: TypographyScaleConfig,
): Record<TypographyVariant, ResolvedTypography> {
  const result = {} as Record<TypographyVariant, ResolvedTypography>;
  for (const variant of TYPOGRAPHY_VARIANTS) {
    result[variant] = resolveTypographySize(variant, config);
  }
  return result;
}
