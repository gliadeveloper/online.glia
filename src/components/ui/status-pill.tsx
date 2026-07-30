import { Typography } from "@/components/typography/typography";

export type StatusPillTone = "complete" | "pending" | "neutral" | "info";

type StatusPillProps = {
  tone: StatusPillTone;
  children: React.ReactNode;
  showCompleteIcon?: boolean;
  className?: string;
};

export function StatusPill({
  tone,
  children,
  showCompleteIcon = tone === "complete",
  className,
}: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${tone}${className ? ` ${className}` : ""}`}>
      {showCompleteIcon && tone === "complete" && (
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
      <Typography as="span" role="caption" weight="medium">
        {children}
      </Typography>
    </span>
  );
}
