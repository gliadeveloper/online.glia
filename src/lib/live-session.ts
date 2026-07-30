import {
  getLiveSessionStatus,
  isLiveKitMetadata,
  parseContentMetadata,
  type LiveKitContentMetadata,
  type LiveSessionStatus,
} from "@/lib/media/content-metadata";

export type LiveCountdown = {
  unit: "days" | "hours";
  value: number;
  label: string;
  msRemaining: number;
  isPast: boolean;
};

export type LiveSessionView = {
  configured: boolean;
  scheduledAt: string | null;
  sessionStatus: LiveSessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  countdown: LiveCountdown | null;
  canJoin: boolean;
  scheduledLabel: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function formatScheduledLabel(scheduledAt: string, locale = "ko-KR") {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function buildLiveCountdown(scheduledAt: string, now = new Date()): LiveCountdown | null {
  const target = new Date(scheduledAt);
  if (Number.isNaN(target.getTime())) return null;

  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    const absHours = Math.abs(diff) / HOUR_MS;
    if (absHours < 24) {
      return {
        unit: "hours",
        value: 0,
        label: "0시간 남았습니다",
        msRemaining: 0,
        isPast: true,
      };
    }
    return {
      unit: "days",
      value: 0,
      label: "0일 남았습니다",
      msRemaining: 0,
      isPast: true,
    };
  }

  if (diff >= DAY_MS) {
    const days = Math.ceil(diff / DAY_MS);
    return {
      unit: "days",
      value: days,
      label: `${days}일 남았습니다`,
      msRemaining: diff,
      isPast: false,
    };
  }

  const hours = Math.ceil(diff / HOUR_MS);
  return {
    unit: "hours",
    value: hours,
    label: `${hours}시간 남았습니다`,
    msRemaining: diff,
    isPast: false,
  };
}

export function buildLiveSessionView(
  metadata: LiveKitContentMetadata | null,
  now = new Date(),
): LiveSessionView {
  if (!metadata?.scheduledAt) {
    return {
      configured: false,
      scheduledAt: null,
      sessionStatus: "SCHEDULED",
      startedAt: null,
      endedAt: null,
      countdown: null,
      canJoin: false,
      scheduledLabel: null,
    };
  }

  const sessionStatus = getLiveSessionStatus(metadata);
  const countdown = buildLiveCountdown(metadata.scheduledAt, now);

  return {
    configured: true,
    scheduledAt: metadata.scheduledAt,
    sessionStatus,
    startedAt: metadata.startedAt ?? null,
    endedAt: metadata.endedAt ?? null,
    countdown,
    canJoin: sessionStatus === "LIVE",
    scheduledLabel: formatScheduledLabel(metadata.scheduledAt),
  };
}

export function getLiveContentMetadataFromLesson(
  contents: Array<{ metadata: unknown }>,
): LiveKitContentMetadata | null {
  for (const content of contents) {
    const metadata = parseContentMetadata(content.metadata as never);
    if (isLiveKitMetadata(metadata)) {
      return metadata;
    }
  }
  return null;
}

export function isLiveLessonReady(metadata: LiveKitContentMetadata | null) {
  return Boolean(metadata?.scheduledAt?.trim());
}
