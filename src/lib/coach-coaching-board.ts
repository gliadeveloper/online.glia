import type { CoachingSessionPublicationStatus } from "@/generated/prisma/client";

export const SEOUL_TZ = "Asia/Seoul";

export const coachPublicationLabels: Record<CoachingSessionPublicationStatus, string> = {
  EMPTY: "미작성",
  DRAFT: "초안",
  PUBLISHED: "발행됨",
};

export type CoachHubTab = "publish" | "qna" | "entitlements" | "offerings";

export type CoachPublishRow = {
  id: string;
  sessionNo: number;
  title: string;
  scheduledAt: string;
  publicationStatus: CoachingSessionPublicationStatus;
  pendingReplyCount: number;
  pendingPreview: string | null;
  pendingAt: string | null;
  user: { id: string; name: string | null; email: string };
  entitlement: { id: string; coachingOffering: { title: string } };
};

export type UpcomingDateGroup = {
  dateKey: string;
  sessions: CoachPublishRow[];
};

export type PublishBoard = {
  todayKey: string;
  overdue: CoachPublishRow[];
  today: CoachPublishRow[];
  upcoming: UpcomingDateGroup[];
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function seoulDateKey(value: string | Date, timeZone = SEOUL_TZ) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseCoachScheduledAt(value: string) {
  const trimmed = value.trim();
  if (DATE_KEY.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00+09:00`);
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatSeoulDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function displayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

export function previewMessage(body: string, max = 80) {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function groupPublishBoard(rows: CoachPublishRow[], now = new Date()): PublishBoard {
  const todayKey = seoulDateKey(now);
  const overdue: CoachPublishRow[] = [];
  const today: CoachPublishRow[] = [];
  const upcomingMap = new Map<string, CoachPublishRow[]>();

  for (const row of rows) {
    if (row.publicationStatus === "PUBLISHED") continue;
    const key = seoulDateKey(row.scheduledAt);
    if (key < todayKey) overdue.push(row);
    else if (key === todayKey) today.push(row);
    else {
      const list = upcomingMap.get(key) ?? [];
      list.push(row);
      upcomingMap.set(key, list);
    }
  }

  const bySchedule = (a: CoachPublishRow, b: CoachPublishRow) =>
    a.scheduledAt.localeCompare(b.scheduledAt) || a.sessionNo - b.sessionNo;

  overdue.sort(bySchedule);
  today.sort(bySchedule);

  const upcoming = [...upcomingMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, sessions]) => ({
      dateKey,
      sessions: [...sessions].sort(bySchedule),
    }));

  return { todayKey, overdue, today, upcoming };
}

export function defaultCoachHubTab(board: PublishBoard, qnaCount: number): CoachHubTab {
  if (board.overdue.length + board.today.length > 0) return "publish";
  if (qnaCount > 0) return "qna";
  return "entitlements";
}

export function parseCoachHubTab(value: string | undefined): CoachHubTab | null {
  if (value === "publish" || value === "qna" || value === "entitlements" || value === "offerings") {
    return value;
  }
  return null;
}

export function qnaInboxRows(rows: CoachPublishRow[]) {
  return rows
    .filter((row) => row.pendingReplyCount > 0)
    .sort((a, b) => (a.pendingAt ?? "").localeCompare(b.pendingAt ?? ""));
}

export function toCoachPublishRow(session: {
  id: string;
  sessionNo: number;
  title: string;
  scheduledAt: Date;
  publicationStatus: CoachingSessionPublicationStatus;
  user: { id: string; name: string | null; email: string };
  entitlement: { id: string; coachingOffering: { title: string } };
  conversation: { messages: Array<{ bodyMarkdown: string; createdAt: Date }> } | null;
}): CoachPublishRow {
  const pending = session.conversation?.messages ?? [];
  const first = pending[0];
  return {
    id: session.id,
    sessionNo: session.sessionNo,
    title: session.title,
    scheduledAt: session.scheduledAt.toISOString(),
    publicationStatus: session.publicationStatus,
    pendingReplyCount: pending.length,
    pendingPreview: first ? previewMessage(first.bodyMarkdown) : null,
    pendingAt: first?.createdAt.toISOString() ?? null,
    user: session.user,
    entitlement: session.entitlement,
  };
}
