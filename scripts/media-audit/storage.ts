import { ListObjectsV2Command, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import type { Inventory } from "./types";

type Lister = { send(command: ListObjectsV2Command): Promise<ListObjectsV2CommandOutput> };

/** Full bucket, all pages. No PUT, GET body, HEAD, COPY, DELETE or lifecycle calls. */
export async function readInventory(client: Lister, bucket: string, maxObjects = 200000): Promise<Inventory> {
  if (!bucket || !Number.isSafeInteger(maxObjects) || maxObjects < 1) throw new Error("INVALID_INVENTORY_LIMIT");
  const result: Inventory = { version: 1, bucket, prefix: "", startedAt: new Date().toISOString(), finishedAt: "", complete: false, objects: [] };
  const tokens = new Set<string>();
  const keys = new Set<string>();
  let token: string | undefined;
  while (true) {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000, ContinuationToken: token, EncodingType: "url" }));
    if (page.CommonPrefixes?.length) throw new Error("PARTIAL_PREFIX_INVENTORY");
    for (const entry of page.Contents ?? []) {
      if (entry.Key === undefined || !Number.isSafeInteger(entry.Size) || entry.Size! < 0) throw new Error("INVALID_INVENTORY_OBJECT");
      // SDK returns the EncodingType response unchanged. Decode exactly once.
      const key = page.EncodingType === "url" ? decodeURIComponent(entry.Key) : entry.Key;
      if (keys.has(key)) throw new Error("INVENTORY_CHANGED_DURING_SCAN");
      keys.add(key);
      result.objects.push({ key, size: String(entry.Size), etag: entry.ETag, lastModified: entry.LastModified?.toISOString() });
      if (result.objects.length > maxObjects || Date.now() - Date.parse(result.startedAt) > 120000) throw new Error("INVENTORY_SCAN_LIMIT");
    }
    if (page.IsTruncated === false) break;
    if (page.IsTruncated !== true || !page.NextContinuationToken || tokens.has(page.NextContinuationToken)) throw new Error("INCOMPLETE_INVENTORY_PAGINATION");
    token = page.NextContinuationToken;
    tokens.add(token);
  }
  result.complete = true;
  result.finishedAt = new Date().toISOString();
  return result;
}
