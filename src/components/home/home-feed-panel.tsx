import Link from "next/link";

import { Typography } from "@/components/typography/typography";

type HomeFeedPanelProps = {
  children: React.ReactNode;
  "aria-labelledby": string;
  className?: string;
};

export function HomeFeedPanel({
  children,
  "aria-labelledby": labelledBy,
  className,
}: HomeFeedPanelProps) {
  return (
    <section aria-labelledby={labelledBy} className={className}>
      <div className="home-feed-panel">{children}</div>
    </section>
  );
}

type HomeFeedPanelHeaderProps = {
  title: string;
  titleId: string;
  moreHref: string;
  moreLabel?: string;
};

export function HomeFeedPanelHeader({
  title,
  titleId,
  moreHref,
  moreLabel = "더보기",
}: HomeFeedPanelHeaderProps) {
  return (
    <div className="home-feed-panel__header">
      <Typography
        as="h2"
        id={titleId}
        role="sectionTitle"
        weight="semibold"
        color="primary"
        className="home-feed-panel__title"
      >
        {title}
      </Typography>
      <Link href={moreHref} className="home-feed-panel__more shell-focus-ring">
        <Typography as="span" role="bodySecondary" color="secondary" weight="medium">
          {moreLabel}
        </Typography>
      </Link>
    </div>
  );
}

type HomeFeedPanelListProps = {
  children: React.ReactNode;
};

export function HomeFeedPanelList({ children }: HomeFeedPanelListProps) {
  return <ul className="home-feed-panel__list">{children}</ul>;
}

type HomeFeedRowProps = {
  href: string;
  title: string;
  subtitle: string;
  leading: React.ReactNode;
  /** Screen reader destination hint — defaults to 「{title} — 상세로 이동」 */
  navigateLabel?: string;
};

export function HomeFeedRow({
  href,
  title,
  subtitle,
  leading,
  navigateLabel,
}: HomeFeedRowProps) {
  const destinationLabel = navigateLabel ?? `${title} — 상세로 이동`;

  return (
    <li>
      <Link href={href} className="home-feed-row shell-focus-ring">
        <span className="home-feed-row__leading">{leading}</span>
        <span className="home-feed-row__body">
          <Typography
            as="span"
            role="bodyCompact"
            weight="semibold"
            color="primary"
            className="home-feed-row__title block truncate"
          >
            {title}
          </Typography>
          <Typography
            as="span"
            role="caption"
            weight="regular"
            color="secondary"
            className="home-feed-row__subtitle block truncate"
          >
            {subtitle}
          </Typography>
        </span>
        <span className="home-feed-row__chevron" aria-hidden="true">
          <svg
            width={18}
            height={18}
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
        <span className="sr-only">{destinationLabel}</span>
      </Link>
    </li>
  );
}

/** Numbered row indicator — reference home feed style. */
export function HomeFeedRowIndex({ index }: { index: number }) {
  return (
    <span className="home-feed-row__index">
      <Typography as="span" role="label" weight="semibold" color="secondary">
        {index}
      </Typography>
    </span>
  );
}

/** Product / course thumbnail or kind placeholder. */
export function HomeFeedRowMedia({
  label,
  imageUrl,
  accent = false,
}: {
  label: string;
  imageUrl?: string | null;
  accent?: boolean;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="home-feed-row__media" />
    );
  }

  return (
    <span
      className={`home-feed-row__media home-feed-row__media--placeholder${accent ? " home-feed-row__media--accent" : ""}`}
      aria-hidden="true"
    >
      <Typography
        as="span"
        role="caption"
        weight="semibold"
        color="secondary"
        className={accent ? "home-feed-row__media-label--accent" : undefined}
      >
        {label.slice(0, 1)}
      </Typography>
    </span>
  );
}
