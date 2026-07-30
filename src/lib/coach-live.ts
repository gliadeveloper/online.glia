import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import {
  createContent,
  deleteContent,
  updateContent,
  updateLesson,
} from "@/lib/curriculum-admin";
import { buildLiveSessionView } from "@/lib/live-session";
import {
  buildLiveRecordingObjectKey,
  isLiveKitMetadata,
  isR2VideoMetadata,
  liveKitRoomNameForLesson,
  mergeLiveKitMetadata,
  parseContentMetadata,
  type LiveKitContentMetadata,
  type LiveRecordingStatus,
  type LiveSessionStatus,
} from "@/lib/media/content-metadata";
import { resolveLessonLiveRoomName } from "@/lib/media/livekit";
import {
  isLiveRecordingConfigured,
  startRoomRecording,
  stopRoomRecording,
  waitForEgressComplete,
} from "@/lib/media/livekit-egress";
import { prisma } from "@/lib/prisma";

export type CoachLiveSessionItem = {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  scheduledAt: string;
  sessionStatus: LiveSessionStatus;
  recordingStatus: LiveRecordingStatus | null;
  scheduledLabel: string | null;
  countdownLabel: string | null;
  canStart: boolean;
  canEnd: boolean;
  canReschedule: boolean;
  canConvertReplay: boolean;
  replayStatusLabel: string;
  hasRecordingConfig: boolean;
  endedAt: string | null;
  recordingObjectKey: string | null;
};

export type CoachLiveReplayItem = {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
  convertedAt: string | null;
  previewHref: string;
};

function describeReplayStatus(params: {
  sessionStatus: LiveSessionStatus;
  recordingStatus: LiveRecordingStatus | null;
  recordingObjectKey: string | null;
  hasRecordingConfig: boolean;
}): { label: string; canConvertReplay: boolean } {
  const { sessionStatus, recordingStatus, recordingObjectKey, hasRecordingConfig } = params;

  if (sessionStatus !== "ENDED") {
    return { label: "", canConvertReplay: false };
  }

  if (!hasRecordingConfig) {
    return {
      label: "R2 녹화 미설정 — 다시보기 자동 변환 불가",
      canConvertReplay: false,
    };
  }

  if (recordingStatus === "processing") {
    return {
      label: "녹화 파일 처리 중…",
      canConvertReplay: false,
    };
  }

  if (recordingObjectKey) {
    if (recordingStatus === "failed") {
      return {
        label: "녹화는 있으나 이전 변환 실패 — 재시도 가능",
        canConvertReplay: true,
      };
    }
    return {
      label: "녹화 완료 — 다시보기로 변환 가능",
      canConvertReplay: true,
    };
  }

  if (recordingStatus === "failed") {
    return {
      label: "녹화 실패 — 다시보기 생성 불가",
      canConvertReplay: false,
    };
  }

  return {
    label: "녹화 파일 없음 — 라이브 종료 시 「종료 · 다시보기 생성」 필요",
    canConvertReplay: false,
  };
}

async function getLiveLessonForCoach(coachId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      type: "LIVE",
      module: { course: { instructorId: coachId } },
    },
    include: {
      contents: { orderBy: { order: "asc" } },
      module: {
        select: {
          id: true,
          title: true,
          order: true,
          courseId: true,
          course: { select: { id: true, title: true, slug: true, instructorId: true } },
        },
      },
    },
  });

  if (!lesson) {
    throw new ApiError("Live lesson not found", 404, "LESSON_NOT_FOUND");
  }

  return lesson;
}

async function getLiveContent(lessonId: string) {
  return prisma.content.findFirst({
    where: { lessonId },
    orderBy: { order: "asc" },
  });
}

function requireLiveMetadata(content: { id: string; metadata: unknown } | null) {
  const metadata = parseContentMetadata(content?.metadata as never);
  if (!isLiveKitMetadata(metadata) || !metadata.scheduledAt) {
    throw new ApiError("Live schedule is required", 400, "LIVE_SCHEDULE_REQUIRED");
  }
  return { content: content!, metadata };
}

export async function listCoachLiveSessions(coachId: string): Promise<CoachLiveSessionItem[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      type: "LIVE",
      module: { course: { instructorId: coachId } },
    },
    include: {
      contents: { orderBy: { order: "asc" }, take: 1 },
      module: {
        select: {
          id: true,
          title: true,
          order: true,
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });

  const items: CoachLiveSessionItem[] = [];

  for (const lesson of lessons) {
    const metadata = parseContentMetadata(lesson.contents[0]?.metadata);
    if (!isLiveKitMetadata(metadata) || !metadata.scheduledAt) {
      continue;
    }

    const view = buildLiveSessionView(metadata);
    const status = metadata.sessionStatus ?? "SCHEDULED";
    const hasRecordingConfig = isLiveRecordingConfigured();
    const replay = describeReplayStatus({
      sessionStatus: status,
      recordingStatus: metadata.recordingStatus ?? null,
      recordingObjectKey: metadata.recordingObjectKey ?? null,
      hasRecordingConfig,
    });

    items.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonOrder: lesson.order,
      moduleId: lesson.module.id,
      moduleTitle: lesson.module.title,
      courseId: lesson.module.course.id,
      courseTitle: lesson.module.course.title,
      courseSlug: lesson.module.course.slug,
      scheduledAt: metadata.scheduledAt,
      sessionStatus: status,
      recordingStatus: metadata.recordingStatus ?? null,
      scheduledLabel: view.scheduledLabel,
      countdownLabel: view.countdown?.label ?? null,
      canStart: status === "SCHEDULED",
      canEnd: status === "LIVE",
      canReschedule: status === "SCHEDULED",
      canConvertReplay: replay.canConvertReplay,
      replayStatusLabel: replay.label,
      hasRecordingConfig,
      endedAt: metadata.endedAt ?? null,
      recordingObjectKey: metadata.recordingObjectKey ?? null,
    });
  }

  return items.sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
}

export async function rescheduleCoachLiveSession(params: {
  coachId: string;
  lessonId: string;
  scheduledAt: string;
}) {
  const lesson = await getLiveLessonForCoach(params.coachId, params.lessonId);
  const content = await getLiveContent(lesson.id);
  const { content: liveContent, metadata } = requireLiveMetadata(content);

  if ((metadata.sessionStatus ?? "SCHEDULED") !== "SCHEDULED") {
    throw new ApiError("Only scheduled lives can be rescheduled", 400, "LIVE_NOT_RESCHEDULABLE");
  }

  const scheduledAt = new Date(params.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new ApiError("Invalid scheduledAt", 400, "VALIDATION_ERROR");
  }

  const nextMetadata = mergeLiveKitMetadata(metadata, {
    ...metadata,
    scheduledAt: scheduledAt.toISOString(),
  });

  await updateContent({
    actorId: params.coachId,
    contentId: liveContent.id,
    metadata: nextMetadata,
  });

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LIVE_RESCHEDULED",
    metadata: { scheduledAt: nextMetadata.scheduledAt },
  });

  return buildLiveSessionView(nextMetadata);
}

export async function startCoachLiveSession(params: {
  coachId: string;
  lessonId: string;
}): Promise<LiveKitContentMetadata> {
  const lesson = await getLiveLessonForCoach(params.coachId, params.lessonId);
  const content = await getLiveContent(lesson.id);
  const { content: liveContent, metadata } = requireLiveMetadata(content);

  const status = metadata.sessionStatus ?? "SCHEDULED";
  if (status === "LIVE") {
    return metadata;
  }
  if (status === "ENDED") {
    throw new ApiError(
      "종료된 라이브는 다시 시작할 수 없습니다. 다시보기로 변환하거나 새 LIVE 레슨을 만드세요.",
      400,
      "LIVE_ALREADY_ENDED",
    );
  }

  const now = new Date().toISOString();
  const roomName = resolveLessonLiveRoomName(lesson.id, metadata.roomName);
  let nextMetadata = mergeLiveKitMetadata(metadata, {
    ...metadata,
    roomName,
    sessionStatus: "LIVE",
    startedAt: now,
    endedAt: undefined,
    recordingStatus: "idle",
  });

  if (isLiveRecordingConfigured()) {
    const objectKey = buildLiveRecordingObjectKey({
      courseId: lesson.module.courseId,
      lessonId: lesson.id,
    });

    try {
      const recording = await startRoomRecording({ roomName, objectKey });
      nextMetadata = mergeLiveKitMetadata(nextMetadata, {
        ...nextMetadata,
        egressId: recording.egressId,
        recordingObjectKey: recording.objectKey,
        recordingStatus: "recording",
      });
    } catch (error) {
      console.error("Live recording start failed:", error);
      nextMetadata = mergeLiveKitMetadata(nextMetadata, {
        ...nextMetadata,
        recordingStatus: "failed",
      });
    }
  }

  await updateContent({
    actorId: params.coachId,
    contentId: liveContent.id,
    metadata: nextMetadata,
  });

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LIVE_STARTED",
    metadata: { roomName, egressId: nextMetadata.egressId },
  });

  return nextMetadata;
}

async function convertLiveLessonToReplay(params: {
  actorId: string;
  lessonId: string;
  lessonTitle: string;
  recordingObjectKey: string;
  liveContentId: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id: params.lessonId },
      data: { type: "VIDEO" },
    });

    await tx.content.delete({ where: { id: params.liveContentId } });

    await tx.content.create({
      data: {
        lessonId: params.lessonId,
        type: "VIDEO",
        title: `${params.lessonTitle} (다시보기)`,
        order: 1,
        metadata: {
          provider: "r2",
          objectKey: params.recordingObjectKey,
          mimeType: "video/mp4",
          fileName: "live-replay.mp4",
          source: "live_recording",
        },
      },
    });
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Lesson",
    entityId: params.lessonId,
    action: "LIVE_CONVERTED_TO_REPLAY",
    metadata: { recordingObjectKey: params.recordingObjectKey },
  });
}

export async function endCoachLiveSession(params: { coachId: string; lessonId: string }) {
  const lesson = await getLiveLessonForCoach(params.coachId, params.lessonId);
  const content = await getLiveContent(lesson.id);
  const { content: liveContent, metadata } = requireLiveMetadata(content);

  if ((metadata.sessionStatus ?? "SCHEDULED") !== "LIVE") {
    throw new ApiError("Live session is not active", 400, "LIVE_NOT_ACTIVE");
  }

  const now = new Date().toISOString();
  let recordingObjectKey = metadata.recordingObjectKey;
  let recordingStatus = metadata.recordingStatus ?? "idle";

  if (metadata.egressId) {
    try {
      recordingStatus = "processing";
      await stopRoomRecording(metadata.egressId);
      await waitForEgressComplete(metadata.egressId);
      recordingStatus = recordingObjectKey ? "ready" : "failed";
    } catch (error) {
      console.error("Live recording stop failed:", error);
      recordingStatus = "failed";
    }
  }

  if (recordingObjectKey && recordingStatus === "ready") {
    await convertLiveLessonToReplay({
      actorId: params.coachId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      recordingObjectKey,
      liveContentId: liveContent.id,
    });

    await updateLesson({
      actorId: params.coachId,
      lessonId: lesson.id,
      title: `${lesson.title} (다시보기)`,
    });

    return {
      converted: true as const,
      recordingObjectKey,
      message: "라이브가 종료되었고 다시보기 동영상으로 업데이트되었습니다.",
    };
  }

  const endedMetadata = mergeLiveKitMetadata(metadata, {
    ...metadata,
    sessionStatus: "ENDED",
    endedAt: now,
    recordingStatus,
  });

  await updateContent({
    actorId: params.coachId,
    contentId: liveContent.id,
    metadata: endedMetadata,
  });

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LIVE_ENDED",
    metadata: { recordingStatus },
  });

  return {
    converted: false as const,
    recordingObjectKey: recordingObjectKey ?? null,
    recordingStatus,
    message:
      recordingStatus === "failed"
        ? "라이브는 종료되었으나 녹화 처리에 실패했습니다. 「다시보기로 변환」을 재시도하거나 R2 설정을 확인하세요."
        : recordingStatus === "processing"
          ? "라이브는 종료되었습니다. 녹화 파일 처리가 끝나면 「다시보기로 변환」을 눌러 주세요."
          : "라이브가 종료되었습니다. 녹화본이 있으면 아래 「다시보기로 변환」을 실행하세요.",
  };
}

export async function convertCoachLiveReplay(params: { coachId: string; lessonId: string }) {
  const lesson = await getLiveLessonForCoach(params.coachId, params.lessonId);
  const content = await getLiveContent(lesson.id);
  const { content: liveContent, metadata } = requireLiveMetadata(content);

  if ((metadata.sessionStatus ?? "SCHEDULED") !== "ENDED") {
    throw new ApiError("종료된 라이브만 다시보기로 변환할 수 있습니다.", 400, "LIVE_NOT_ENDED");
  }

  let recordingObjectKey = metadata.recordingObjectKey;
  let recordingStatus = metadata.recordingStatus ?? "idle";

  if (!recordingObjectKey && !metadata.egressId) {
    throw new ApiError("변환할 녹화 파일이 없습니다.", 400, "RECORDING_NOT_AVAILABLE");
  }

  if (metadata.egressId && recordingStatus !== "ready") {
    try {
      recordingStatus = "processing";
      await waitForEgressComplete(metadata.egressId);
      recordingStatus = recordingObjectKey ? "ready" : "failed";
    } catch (error) {
      console.error("Live recording wait failed:", error);
      throw new ApiError(
        "녹화 파일 처리에 실패했습니다. LiveKit/R2 설정과 egress 로그를 확인하세요.",
        500,
        "EGRESS_FAILED",
      );
    }
  }

  if (!recordingObjectKey) {
    throw new ApiError("녹화 object key가 없습니다.", 400, "RECORDING_NOT_AVAILABLE");
  }

  await convertLiveLessonToReplay({
    actorId: params.coachId,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    recordingObjectKey,
    liveContentId: liveContent.id,
  });

  await updateLesson({
    actorId: params.coachId,
    lessonId: lesson.id,
    title: lesson.title.endsWith(" (다시보기)") ? lesson.title : `${lesson.title} (다시보기)`,
  });

  return {
    converted: true as const,
    recordingObjectKey,
    message: "다시보기 동영상으로 변환되었습니다. 수강생은 같은 레슨 URL에서 VOD로 시청합니다.",
  };
}

export async function listCoachLiveReplays(coachId: string): Promise<CoachLiveReplayItem[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      type: "VIDEO",
      module: { course: { instructorId: coachId } },
    },
    include: {
      contents: { orderBy: { order: "asc" }, take: 1 },
      module: {
        select: {
          course: { select: { title: true, slug: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const replays: CoachLiveReplayItem[] = [];

  for (const lesson of lessons) {
    const metadata = parseContentMetadata(lesson.contents[0]?.metadata);
    if (!isR2VideoMetadata(metadata) || metadata.source !== "live_recording") {
      continue;
    }

    replays.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseTitle: lesson.module.course.title,
      courseSlug: lesson.module.course.slug,
      convertedAt: lesson.updatedAt.toISOString(),
      previewHref: `/learning/${lesson.module.course.slug}/lessons/${lesson.id}`,
    });
  }

  return replays;
}

export async function ensureCoachLiveContent(params: {
  coachId: string;
  lessonId: string;
  scheduledAt: string;
}) {
  const lesson = await getLiveLessonForCoach(params.coachId, params.lessonId);
  const existing = await getLiveContent(lesson.id);
  const scheduledAt = new Date(params.scheduledAt).toISOString();
  const roomName = liveKitRoomNameForLesson(lesson.id);

  if (existing) {
    const metadata = parseContentMetadata(existing.metadata);
    const base = isLiveKitMetadata(metadata)
      ? metadata
      : {
          provider: "livekit" as const,
          roomName,
          scheduledAt,
        };

    const nextMetadata = mergeLiveKitMetadata(
      isLiveKitMetadata(metadata) ? metadata : null,
      {
        ...base,
        roomName,
        scheduledAt,
      },
    );

    await updateContent({
      actorId: params.coachId,
      contentId: existing.id,
      metadata: nextMetadata,
    });

    return nextMetadata;
  }

  const content = await createContent({
    actorId: params.coachId,
    lessonId: lesson.id,
    type: "LINK",
    title: "LiveKit 세션",
    metadata: {
      provider: "livekit",
      roomName,
      scheduledAt,
      sessionStatus: "SCHEDULED",
    },
  });

  return parseContentMetadata(content.metadata) as ReturnType<typeof mergeLiveKitMetadata>;
}
