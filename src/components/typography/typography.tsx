import {
  TYPOGRAPHY_ROLES,
  typoClassName,
  type TypographyRole,
  type TypographyVariant,
} from "@/lib/typography";

type TypographyColor = "primary" | "secondary" | "disabled" | "action" | "inherit";
type TypographyWeight = "regular" | "medium" | "semibold" | "bold";

const COLOR_CLASS: Record<Exclude<TypographyColor, "inherit">, string> = {
  primary: "text-[var(--color-text-primary)]",
  secondary: "text-[var(--color-text-secondary)]",
  disabled: "text-[var(--color-text-disabled)]",
  action: "typography-action",
};

const WEIGHT_CLASS: Record<TypographyWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

type TypographyElement =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "div"
  | "label"
  | "legend"
  | "li"
  | "dt"
  | "dd"
  | "figcaption"
  | "blockquote";

export type TypographyProps = {
  /** Token variant — never pass raw font-size. */
  variant?: TypographyVariant;
  /** Semantic role shortcut — resolves to a token. Overrides `variant` when set. */
  role?: TypographyRole;
  as?: TypographyElement;
  color?: TypographyColor;
  weight?: TypographyWeight;
  className?: string;
  children?: React.ReactNode;
  id?: string;
};

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function resolveVariant(props: TypographyProps): TypographyVariant {
  if (props.role) return TYPOGRAPHY_ROLES[props.role];
  return props.variant ?? "typography5";
}

export function Typography({
  variant,
  role,
  as: Tag = "p",
  color = "inherit",
  weight = "regular",
  className,
  children,
  id,
}: TypographyProps) {
  const resolvedVariant = resolveVariant({ variant, role });

  return (
    <Tag
      id={id}
      className={joinClasses(
        typoClassName(resolvedVariant),
        color !== "inherit" ? COLOR_CLASS[color] : undefined,
        WEIGHT_CLASS[weight],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
