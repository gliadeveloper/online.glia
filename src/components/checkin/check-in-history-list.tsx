import Link from "next/link";

import { Typography } from "@/components/typography/typography";

export type CheckInHistoryItem = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  done?: boolean;
};

type CheckInHistoryListProps = {
  items: CheckInHistoryItem[];
  emptyMessage: string;
  labelledBy: string;
  /** Full history page uses compact density */
  variant?: "hub" | "page";
};

export function CheckInHistoryList({
  items,
  emptyMessage,
  labelledBy,
  variant = "hub",
}: CheckInHistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="check-in-history__empty">
        <Typography as="span" role="bodySecondary" color="secondary">
          {emptyMessage}
        </Typography>
      </p>
    );
  }

  return (
    <ul
      className={`check-in-history__list${variant === "page" ? " check-in-history__list--page" : ""}`}
      aria-labelledby={labelledBy}
    >
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className="check-in-history__row shell-focus-ring">
            <span className="check-in-history__body">
              <Typography
                as="span"
                role="bodyCompact"
                weight="semibold"
                color="primary"
                className="check-in-history__title block truncate"
              >
                {item.title}
              </Typography>
              {item.subtitle && (
                <Typography
                  as="span"
                  role="caption"
                  weight="regular"
                  color="secondary"
                  className="check-in-history__meta block truncate"
                >
                  {item.subtitle}
                </Typography>
              )}
            </span>
            <span className="check-in-history__chevron size-4 shrink-0" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
            <span className="sr-only">{item.title} — 기록 보기</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
