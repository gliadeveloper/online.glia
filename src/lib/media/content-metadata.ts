import type { Prisma } from "@/generated/prisma/client";

export type LiveSessionStatus = "SCHEDULED" | "LIVE" | "ENDED";

export type LiveRecordingStatus = "idle" | "recording" | "processing" | "ready" | "failed";

export type R2VideoMetadata = {
  provider: "r2";
  objectKey: string;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
  durationSeconds?: number;
  source?: "live_recording" | "upload";
};

export type LiveKitContentMetadata = {
  provider: "livekit";
  roomName: string;
  scheduledAt: string;
  sessionStatus?: LiveSessionStatus;
  startedAt?: string;
  endedAt?: string;
  egressId?: string;
  recordingStatus?: LiveRecordingStatus;
  recordingObjectKey?: string;
  convertedToReplayAt?: string;
};

export type ContentMetadata = R2VideoMetadata | LiveKitContentMetadata | Record<string, unknown>;

export function parseContentMetadata(value: Prisma.JsonValue | null | undefined): ContentMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as ContentMetadata;
}

export function isR2VideoMetadata(metadata: ContentMetadata | null): metadata is R2VideoMetadata {
  return metadata?.provider === "r2" && typeof metadata.objectKey === "string";
}

export function isLiveKitMetadata(metadata: ContentMetadata | null): metadata is LiveKitContentMetadata {
  return metadata?.provider === "livekit" && typeof metadata.roomName === "string";
}

export function getLiveSessionStatus(metadata: LiveKitContentMetadata): LiveSessionStatus {
  return metadata.sessionStatus ?? "SCHEDULED";
}

export function buildCourseVideoObjectKey(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `courses/${params.courseId}/lessons/${params.lessonId}/${Date.now()}-${safeName}`;
}

export function liveKitRoomNameForLesson(lessonId: string) {
  return `lesson-${lessonId}`;
}

export function mergeLiveKitMetadata(
  existing: LiveKitContentMetadata | null,
  patch: Partial<LiveKitContentMetadata> & { roomName: string; scheduledAt: string },
): LiveKitContentMetadata {
  return {
    provider: "livekit",
    roomName: patch.roomName,
    scheduledAt: patch.scheduledAt,
    sessionStatus: patch.sessionStatus ?? existing?.sessionStatus ?? "SCHEDULED",
    startedAt: patch.startedAt ?? existing?.startedAt,
    endedAt: patch.endedAt ?? existing?.endedAt,
    recordingObjectKey: patch.recordingObjectKey ?? existing?.recordingObjectKey,
    egressId: patch.egressId ?? existing?.egressId,
    recordingStatus: patch.recordingStatus ?? existing?.recordingStatus,
    convertedToReplayAt: patch.convertedToReplayAt ?? existing?.convertedToReplayAt,
  };
}

export function buildLiveRecordingObjectKey(params: {
  courseId: string;
  lessonId: string;
}) {
  return `courses/${params.courseId}/lessons/${params.lessonId}/live-${Date.now()}.mp4`;
}
