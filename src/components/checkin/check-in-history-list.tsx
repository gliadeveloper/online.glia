import Link from "next/link";

export type CheckInHistoryItem = {
  id: string;
  href: string;
  title: string;
  kind?: "daily" | "weekly";
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

function kindLabel(kind?: "daily" | "weekly") {
  if (kind === "weekly") return "주간";
  if (kind === "daily") return "데일리";
  return null;
}

export function CheckInHistoryList({
  items,
  emptyMessage,
  labelledBy,
  variant = "hub",
}: CheckInHistoryListProps) {
  if (items.length === 0) {
    return (
      <p
        className={`check-in-history__empty${variant === "hub" ? " check-in-history__empty--hub" : ""}`}
      >
        {emptyMessage}
      </p>
    );
  }

  const isHub = variant === "hub";

  return (
    <ul
      className={`check-in-history__list${isHub ? " check-in-history__list--hub-surface" : " check-in-history__list--page"}`}
      aria-labelledby={labelledBy}
    >
      {items.map((item) => {
        const label = kindLabel(item.kind);
        const secondary = isHub ? (item.subtitle ?? label) : null;

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`check-in-history__row shell-focus-ring${isHub ? " check-in-history__row--hub" : ""}`}
            >
              {!isHub && label ? (
                <span
                  className={`check-in-history__kind check-in-history__kind--${item.kind}`}
                  aria-hidden="true"
                >
                  {label}
                </span>
              ) : null}
              <span className="check-in-history__body">
                <span className="check-in-history__title">{item.title}</span>
                {secondary ? (
                  <span className="check-in-history__subtitle">{secondary}</span>
                ) : null}
              </span>
              <span className="check-in-history__chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="sr-only">{item.title} — 기록 보기</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
