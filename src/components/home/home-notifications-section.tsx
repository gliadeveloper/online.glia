"use client";

import Link from "next/link";
import { useState } from "react";

import type { HomeNotification } from "@/lib/home-notifications";
import { HomeFeedPanel } from "@/components/home/home-feed-panel";

function formatRelativeTime(date: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1_440)}일 전`;
}

const iconByKind = { live: "●", comment: "✦", session: "□" };

export function HomeNotificationsSection({ notifications }: { notifications: HomeNotification[] }) {
  const [expanded, setExpanded] = useState(false);
  if (notifications.length === 0) return null;
  const visible = expanded ? notifications : notifications.slice(0, 3);
  const remaining = notifications.length - 3;

  return (
    <HomeFeedPanel aria-labelledby="home-notifications-heading">
      <div className="home-notifications">
        <div className="home-feed-panel__header">
          <h2 id="home-notifications-heading" className="home-feed-panel__title">지금 확인할 일</h2>
          <span className="home-notifications__caption">읽지 않은 소식</span>
        </div>
        <ul className="home-notifications__list">
          {visible.map((notification) => (
            <li key={notification.id}>
              <Link href={notification.href} className={`home-notifications__item home-notifications__item--${notification.kind}`}>
                <span className="home-notifications__icon" aria-hidden="true">{iconByKind[notification.kind]}</span>
                <span className="home-notifications__body"><span className="home-notifications__label">{notification.label}</span><span className="home-notifications__title">{notification.title}</span></span>
                <span className="home-notifications__time">{notification.kind === "live" ? "입장 ›" : formatRelativeTime(notification.occurredAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {remaining > 0 && <button type="button" className="home-notifications__expand" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "접기" : `새 알림 ${remaining}개 더 보기`}</button>}
      </div>
    </HomeFeedPanel>
  );
}
