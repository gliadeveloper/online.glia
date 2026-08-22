"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ChevronIcon,
  CommentIcon,
  LiveIcon,
  SessionIcon,
} from "@/components/home/home-icons";
import type { HomeAlertItem } from "@/lib/home";

const PREVIEW_COUNT = 3;

const iconByKind = {
  live: LiveIcon,
  comment: CommentIcon,
  session: SessionIcon,
} as const;

type HomeAlertsProps = {
  items: HomeAlertItem[];
};

export function HomeAlerts({ items }: HomeAlertsProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const remaining = items.length - PREVIEW_COUNT;

  return (
    <section className="glia-section" aria-labelledby="home-alerts-heading">
      <header className="glia-section__header">
        <h2 id="home-alerts-heading" className="glia-section__title">
          지금 확인할 일
        </h2>
        <p className="glia-section__caption">읽지 않은 소식 {items.length}건</p>
      </header>

      <ul className="glia-alert-list">
        {visible.map((item) => {
          const Icon = iconByKind[item.kind];
          return (
            <li key={item.id}>
              <Link href={item.href} className={`glia-alert glia-alert--${item.kind}`}>
                <span className="glia-alert__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="glia-alert__body">
                  <span className="glia-alert__label">{item.label}</span>
                  <span className="glia-alert__title">{item.title}</span>
                </span>
                <span className="glia-alert__meta">
                  {item.timeLabel}
                  <ChevronIcon />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {remaining > 0 && (
        <button
          type="button"
          className="glia-alert__expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "접기" : `새 알림 ${remaining}개 더 보기`}
        </button>
      )}
    </section>
  );
}
