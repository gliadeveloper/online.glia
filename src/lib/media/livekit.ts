import { AccessToken } from "livekit-server-sdk";

import { ApiError } from "@/lib/api";

import { liveKitRoomNameForLesson } from "./content-metadata";

export type LiveKitConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

export function getLiveKitConfig(): LiveKitConfig | null {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!url || !apiKey || !apiSecret) {
    return null;
  }

  return { url, apiKey, apiSecret };
}

export function isLiveKitConfigured() {
  return getLiveKitConfig() !== null;
}

export function requireLiveKitConfig() {
  const config = getLiveKitConfig();
  if (!config) {
    throw new ApiError("LiveKit is not configured", 503, "LIVEKIT_NOT_CONFIGURED");
  }
  return config;
}

export async function createLiveKitToken(params: {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
  ttlSeconds?: number;
}) {
  const config = requireLiveKitConfig();

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: params.ttlSeconds ?? 60 * 60,
  });

  token.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: params.canPublish,
    canSubscribe: true,
    canPublishData: params.canPublish,
  });

  const jwt = await token.toJwt();

  return {
    token: jwt,
    url: config.url,
    roomName: params.roomName,
  };
}

export function resolveLessonLiveRoomName(lessonId: string, metadataRoomName?: string | null) {
  return metadataRoomName?.trim() || liveKitRoomNameForLesson(lessonId);
}
