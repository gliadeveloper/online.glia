import {
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";

import { ApiError } from "@/lib/api";

import { getR2Config } from "./r2-config";
import { requireLiveKitConfig } from "./livekit";

function getLiveKitApiHost() {
  const raw =
    process.env.LIVEKIT_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ||
    "";

  if (!raw) {
    throw new ApiError("LiveKit API URL is not configured", 503, "LIVEKIT_NOT_CONFIGURED");
  }

  return raw.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
}

export function createEgressClient() {
  const config = requireLiveKitConfig();
  return new EgressClient(getLiveKitApiHost(), config.apiKey, config.apiSecret);
}

export function isLiveRecordingConfigured() {
  return getR2Config() !== null;
}

export async function startRoomRecording(params: { roomName: string; objectKey: string }) {
  const r2 = getR2Config();
  if (!r2) {
    throw new ApiError("R2 storage is not configured for recording", 503, "R2_NOT_CONFIGURED");
  }

  const client = createEgressClient();

  const fileOutput = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: params.objectKey,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: r2.accessKeyId,
        secret: r2.secretAccessKey,
        bucket: r2.bucket,
        region: r2.region,
        endpoint: r2.endpoint,
        forcePathStyle: true,
      }),
    },
  });

  const info = await client.startRoomCompositeEgress(params.roomName, {
    file: fileOutput,
  });

  if (!info.egressId) {
    throw new ApiError("Failed to start live recording", 500, "EGRESS_START_FAILED");
  }

  return {
    egressId: info.egressId,
    objectKey: params.objectKey,
  };
}

export async function stopRoomRecording(egressId: string) {
  const client = createEgressClient();
  return client.stopEgress(egressId);
}

export async function waitForEgressComplete(egressId: string, maxWaitMs = 120000) {
  const client = createEgressClient();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const items = await client.listEgress({ egressId });
    const item = items[0];

    if (!item) {
      throw new ApiError("Egress not found", 404, "EGRESS_NOT_FOUND");
    }

    if (item.status === EgressStatus.EGRESS_COMPLETE) {
      return item;
    }

    if (
      item.status === EgressStatus.EGRESS_FAILED ||
      item.status === EgressStatus.EGRESS_ABORTED
    ) {
      throw new ApiError("Live recording failed", 500, "EGRESS_FAILED");
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new ApiError("Live recording processing timed out", 504, "EGRESS_TIMEOUT");
}
