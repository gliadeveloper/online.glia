/**
 * Typography design tokens — single source of truth.
 * Base sizes at 100% scale; never hardcode px in components.
 */

export const TYPOGRAPHY_VARIANTS = [
  "typography1",
  "subTypography1",
  "subTypography2",
  "subTypography3",
  "typography2",
  "subTypography4",
  "subTypography5",
  "subTypography6",
  "typography3",
  "subTypography7",
  "typography4",
  "subTypography8",
  "subTypography9",
  "typography5",
  "subTypography10",
  "typography6",
  "subTypography11",
  "typography7",
  "subTypography12",
  "subTypography13",
] as const;

export type TypographyVariant = (typeof TYPOGRAPHY_VARIANTS)[number];

export type TypographyToken = {
  fontSize: number;
  lineHeight: number;
  maxFontSize: number;
  usage: string;
};

export const TYPOGRAPHY_TOKENS: Record<TypographyVariant, TypographyToken> = {
  typography1: { fontSize: 30, lineHeight: 40, maxFontSize: 42, usage: "매우 큰 제목" },
  subTypography1: { fontSize: 29, lineHeight: 38, maxFontSize: 42, usage: "sub — typography1" },
  subTypography2: { fontSize: 28, lineHeight: 37, maxFontSize: 41, usage: "sub — typography1" },
  subTypography3: { fontSize: 27, lineHeight: 36, maxFontSize: 41, usage: "sub — typography1" },
  typography2: { fontSize: 26, lineHeight: 35, maxFontSize: 41, usage: "큰 제목" },
  subTypography4: { fontSize: 25, lineHeight: 34, maxFontSize: 41, usage: "sub — typography2" },
  subTypography5: { fontSize: 24, lineHeight: 33, maxFontSize: 40, usage: "조금 큰 제목" },
  subTypography6: { fontSize: 23, lineHeight: 32, maxFontSize: 40, usage: "sub — typography2" },
  typography3: { fontSize: 22, lineHeight: 31, maxFontSize: 40, usage: "일반 제목" },
  subTypography7: { fontSize: 21, lineHeight: 30, maxFontSize: 40, usage: "sub — typography3" },
  typography4: { fontSize: 20, lineHeight: 29, maxFontSize: 40, usage: "작은 제목" },
  subTypography8: { fontSize: 19, lineHeight: 28, maxFontSize: 40, usage: "sub — typography4" },
  subTypography9: { fontSize: 18, lineHeight: 27, maxFontSize: 39, usage: "조금 큰 본문" },
  typography5: { fontSize: 17, lineHeight: 25.5, maxFontSize: 39, usage: "일반 본문" },
  subTypography10: { fontSize: 16, lineHeight: 24, maxFontSize: 39, usage: "sub — typography5" },
  typography6: { fontSize: 15, lineHeight: 22.5, maxFontSize: 37, usage: "작은 본문" },
  subTypography11: { fontSize: 14, lineHeight: 21, maxFontSize: 36, usage: "sub — typography6" },
  typography7: { fontSize: 13, lineHeight: 19.5, maxFontSize: 34, usage: "안 읽어도 됨" },
  subTypography12: { fontSize: 12, lineHeight: 18, maxFontSize: 32, usage: "sub — typography7" },
  subTypography13: { fontSize: 11, lineHeight: 16.5, maxFontSize: 31, usage: "아예 안 읽어도 됨" },
};

/** iOS Dynamic Type — discrete scale steps mapped to approximate percentages. */
export const IOS_SCALE_STEPS = [
  "100%",
  "Large",
  "xLarge",
  "xxLarge",
  "xxxLarge",
  "A11y_Medium",
  "A11y_Large",
  "A11y_xLarge",
  "A11y_xxLarge",
  "A11y_xxxLarge",
] as const;

export type IosScaleStep = (typeof IOS_SCALE_STEPS)[number];

export const IOS_SCALE_PERCENT: Record<IosScaleStep, number> = {
  "100%": 100,
  Large: 110,
  xLarge: 120,
  xxLarge: 135,
  xxxLarge: 160,
  A11y_Medium: 190,
  A11y_Large: 235,
  A11y_xLarge: 275,
  A11y_xxLarge: 310,
  A11y_xxxLarge: 310,
};

/**
 * iOS font-size lookup (line-height scaled proportionally at runtime).
 * Rows: variant, columns: IOS_SCALE_STEPS order.
 */
export const IOS_FONT_SIZE_TABLE: Record<IosScaleStep, Record<TypographyVariant, number>> = {
  "100%": {
    typography1: 30, subTypography1: 29, subTypography2: 28, subTypography3: 27,
    typography2: 26, subTypography4: 25, subTypography5: 24, subTypography6: 23,
    typography3: 22, subTypography7: 21, typography4: 20, subTypography8: 19,
    subTypography9: 18, typography5: 17, subTypography10: 16, typography6: 15,
    subTypography11: 14, typography7: 13, subTypography12: 12, subTypography13: 11,
  },
  Large: {
    typography1: 32, subTypography1: 31, subTypography2: 30, subTypography3: 29,
    typography2: 28, subTypography4: 27, subTypography5: 26, subTypography6: 25,
    typography3: 24, subTypography7: 23, typography4: 22, subTypography8: 21,
    subTypography9: 20, typography5: 19, subTypography10: 18, typography6: 17,
    subTypography11: 16, typography7: 15, subTypography12: 14, subTypography13: 13,
  },
  xLarge: {
    typography1: 34, subTypography1: 33, subTypography2: 32, subTypography3: 31,
    typography2: 30, subTypography4: 29, subTypography5: 28, subTypography6: 27,
    typography3: 26, subTypography7: 25, typography4: 24, subTypography8: 23,
    subTypography9: 22, typography5: 21, subTypography10: 20, typography6: 19,
    subTypography11: 18, typography7: 17, subTypography12: 16, subTypography13: 15,
  },
  xxLarge: {
    typography1: 36, subTypography1: 35, subTypography2: 34, subTypography3: 33,
    typography2: 32, subTypography4: 31, subTypography5: 30, subTypography6: 29,
    typography3: 28, subTypography7: 27, typography4: 26, subTypography8: 25,
    subTypography9: 24, typography5: 23, subTypography10: 22, typography6: 21,
    subTypography11: 20, typography7: 19, subTypography12: 18, subTypography13: 17,
  },
  xxxLarge: {
    typography1: 40, subTypography1: 39, subTypography2: 38, subTypography3: 37,
    typography2: 36, subTypography4: 36, subTypography5: 35, subTypography6: 34,
    typography3: 33, subTypography7: 32, typography4: 31, subTypography8: 30,
    subTypography9: 28, typography5: 27, subTypography10: 26, typography6: 24,
    subTypography11: 23, typography7: 21, subTypography12: 20, subTypography13: 19,
  },
  A11y_Medium: {
    typography1: 41, subTypography1: 40, subTypography2: 39, subTypography3: 38,
    typography2: 38, subTypography4: 38, subTypography5: 37, subTypography6: 37,
    typography3: 36, subTypography7: 36, typography4: 35, subTypography8: 34,
    subTypography9: 33, typography5: 32, subTypography10: 30, typography6: 28,
    subTypography11: 26, typography7: 24, subTypography12: 22, subTypography13: 21,
  },
  A11y_Large: {
    typography1: 41, subTypography1: 41, subTypography2: 40, subTypography3: 40,
    typography2: 40, subTypography4: 40, subTypography5: 39, subTypography6: 39,
    typography3: 39, subTypography7: 39, typography4: 38, subTypography8: 38,
    subTypography9: 37, typography5: 36, subTypography10: 34, typography6: 31,
    subTypography11: 29, typography7: 27, subTypography12: 25, subTypography13: 24,
  },
  A11y_xLarge: {
    typography1: 42, subTypography1: 42, subTypography2: 41, subTypography3: 41,
    typography2: 41, subTypography4: 41, subTypography5: 40, subTypography6: 40,
    typography3: 40, subTypography7: 40, typography4: 40, subTypography8: 40,
    subTypography9: 38, typography5: 38, subTypography10: 37, typography6: 34,
    subTypography11: 32, typography7: 30, subTypography12: 28, subTypography13: 27,
  },
  A11y_xxLarge: {
    typography1: 42, subTypography1: 42, subTypography2: 41, subTypography3: 41,
    typography2: 41, subTypography4: 41, subTypography5: 40, subTypography6: 40,
    typography3: 40, subTypography7: 40, typography4: 40, subTypography8: 40,
    subTypography9: 39, typography5: 39, subTypography10: 39, typography6: 37,
    subTypography11: 36, typography7: 34, subTypography12: 32, subTypography13: 31,
  },
  A11y_xxxLarge: {
    typography1: 42, subTypography1: 42, subTypography2: 41, subTypography3: 41,
    typography2: 41, subTypography4: 41, subTypography5: 40, subTypography6: 40,
    typography3: 40, subTypography7: 40, typography4: 40, subTypography8: 40,
    subTypography9: 39, typography5: 39, subTypography10: 39, typography6: 37,
    subTypography11: 36, typography7: 34, subTypography12: 32, subTypography13: 31,
  },
};

/** Semantic roles for `(app)` UI — maps intent to token, not raw px. */
export const TYPOGRAPHY_ROLES = {
  display: "typography2",
  pageTitle: "subTypography5",
  sectionTitle: "subTypography9",
  contextTitle: "subTypography10",
  body: "typography5",
  bodyCompact: "subTypography10",
  bodySecondary: "subTypography11",
  label: "subTypography11",
  caption: "subTypography12",
  micro: "subTypography13",
} as const satisfies Record<string, TypographyVariant>;

export type TypographyRole = keyof typeof TYPOGRAPHY_ROLES;

export function cssVarName(variant: TypographyVariant, property: "size" | "line-height"): string {
  return `--typo-${variant}-${property}`;
}

export function typoClassName(variant: TypographyVariant): string {
  return `typo-${variant}`;
}

export function typoRoleClass(role: TypographyRole): string {
  return typoClassName(TYPOGRAPHY_ROLES[role]);
}
