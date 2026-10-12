import { requireSessionUserId } from "@/lib/api";
import { createMediaGetHandler } from "@/lib/media/media-delivery";
import { resolveMediaLocation } from "@/lib/media/media-location";
import { getR2Config } from "@/lib/media/r2-config";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const GET = createMediaGetHandler({
  resolve: url => {
    const config = getR2Config();
    return resolveMediaLocation(prisma, url, requireSessionUserId, config?.bucket, config?.legacyKeyPrefix);
  },
});
