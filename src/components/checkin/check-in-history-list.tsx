import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
    return <p className="glia-ci-empty">{emptyMessage}</p>;
  }

  const isPage = variant === "page";

  return (
    <ul className="glia-ci-list" aria-labelledby={labelledBy}>
      {items.map((item) => {
        const label = kindLabel(item.kind);

        return (
          <li key={item.id}>
            <Link href={item.href} className="glia-ci-row">
              {isPage && label ? (
                <span className={`glia-ci-kind${item.kind === "weekly" ? " glia-ci-kind--weekly" : ""}`}>
                  {label}
                </span>
              ) : null}
              <span className="glia-ci-row__body">
                <span className="glia-ci-row__title">{item.title}</span>
                {!isPage && (item.subtitle ?? label) ? (
                  <span className="glia-ci-row__meta">{item.subtitle ?? label}</span>
                ) : null}
              </span>
              <ChevronRight className="glia-ci-chevron" strokeWidth={2} size={16} />
              <span className="sr-only">{item.title} — 기록 보기</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
