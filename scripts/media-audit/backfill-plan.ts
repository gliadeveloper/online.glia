import type { AuditConfig, AuditSource, Inventory, Snapshot } from "./types";
import { reconcile } from "./reconcile";
import { keyRef } from "./references";

const identity = (bucket: string, key: string) => JSON.stringify([bucket, key]);
const legacyContentPath = (key: string) => /^(?:coaching\/[^/]+\/(?:images|videos|audio)\/|courses\/[^/]+\/lessons\/[^/]+\/(?:images|videos|audio)\/)/.test(key);
type Use = { source: string; target: NonNullable<AuditSource["target"]>; expectedBodyVersion: string | null; occurrenceCount: number };

/** Review artifact only: no DB client, storage calls, classification or READY claim. */
export function buildBackfillPlan(snapshot: Snapshot, inventory: Inventory, config: AuditConfig) {
  const audit = reconcile(snapshot, inventory, config);
  if (!inventory.complete || snapshot.mediaSchema === "PARTIAL") throw new Error("BACKFILL_INPUT_INCOMPLETE");
  const filesByUrl = new Map(snapshot.files.map(f => [f.urlKey, f]));
  const aliases = new Map((config.keyAliases ?? []).map(a => [a.urlKey, a]));
  const registered = new Map(snapshot.files.map(f => [identity(f.bucket, f.objectKey), f]));
  const listed = new Map(inventory.objects.map(o => [identity(inventory.bucket, o.key), o]));
  const observed = new Map(audit.objects.map(o => [identity(inventory.bucket, o.objectKey), o]));
  const entries = new Map<string, {
    bucket: string; objectKey: string; urlKeys: Set<string>; usages: Use[]; externalSources: Set<string>; possibleSources: Set<string>;
  }>();
  const entry = (bucket: string, objectKey: string) => {
    const id = identity(bucket, objectKey);
    if (!entries.has(id)) entries.set(id, { bucket, objectKey, urlKeys: new Set(), usages: [], externalSources: new Set(), possibleSources: new Set() });
    return entries.get(id)!;
  };
  for (const object of inventory.objects) entry(inventory.bucket, object.key);
  const resolve = (key: string) => filesByUrl.get(key) ?? aliases.get(key) ?? { bucket: inventory.bucket, objectKey: key };
  for (const source of snapshot.sources) {
    const counts = new Map<string, number>();
    for (const group of source.groups) {
      const groupCounts = new Map<string, number>();
      for (const ref of group) {
        if (!ref.key) continue; // asset-only references are already registered, or an audit error.
        const location = resolve(ref.key), item = entry(location.bucket, location.objectKey);
        item.urlKeys.add(ref.key);
        if (!source.target) item.externalSources.add(source.source);
        const id = identity(item.bucket, item.objectKey);
        groupCounts.set(id, (groupCounts.get(id) ?? 0) + 1);
      }
      for (const [id, count] of groupCounts) counts.set(id, Math.max(counts.get(id) ?? 0, count));
    }
    if (source.target) for (const [id, count] of counts) entries.get(id)!.usages.push({
      source: source.source, target: source.target, expectedBodyVersion: source.bodyVersion ?? null, occurrenceCount: count,
    });
    for (const key of source.possibleKeys) {
      const location = resolve(key), item = entry(location.bucket, location.objectKey);
      item.urlKeys.add(key); item.possibleSources.add(source.source);
    }
  }
  // Explicitly reviewed mappings also describe currently unreferenced files.
  for (const alias of config.keyAliases ?? []) entries.get(identity(alias.bucket, alias.objectKey))?.urlKeys.add(alias.urlKey);
  for (const file of snapshot.files) entry(file.bucket, file.objectKey).urlKeys.add(file.urlKey);
  const planned = [...entries.values()].map(item => {
    const id = identity(item.bucket, item.objectKey), object = listed.get(id), file = registered.get(id);
    const urlKeys = [...item.urlKeys].sort();
    const inScope = [item.objectKey, ...urlKeys].some(legacyContentPath);
    const reviews: string[] = [];
    if (item.bucket !== inventory.bucket) reviews.push("BUCKET_NOT_SCANNED");
    else if (!object) reviews.push("OBJECT_NOT_LISTED");
    if (urlKeys.length > 1) reviews.push("MULTIPLE_URL_KEYS_REQUIRE_MAPPING_POLICY");
    if (item.externalSources.size) reviews.push("EXTERNAL_ACCESS_POLICY_REQUIRED");
    if (item.possibleSources.size) reviews.push("POSSIBLE_REFERENCE_REVIEW");
    if (item.usages.some(u => !u.expectedBodyVersion || !/^[a-f0-9]{64}$/.test(u.expectedBodyVersion))) reviews.push("SOURCE_VERSION_REQUIRED");
    if (observed.get(id)?.flags.includes("CONTEXT_NOT_FOUND")) reviews.push("CONTEXT_NOT_FOUND");
    const decision = item.bucket !== inventory.bucket ? "REVIEW_OTHER_BUCKET"
      : !object ? "BLOCKED_MISSING_OBJECT"
      : file ? "KEEP_REGISTERED"
      : !inScope ? "PRESERVE_OUTSIDE_SCOPE"
      : item.externalSources.size ? "REVIEW_EXTERNAL_CONSUMER"
      : !item.usages.length ? item.possibleSources.size ? "REVIEW_POSSIBLE_REFERENCE" : "PRESERVE_UNREFERENCED"
      : reviews.length ? "REVIEW_BEFORE_REGISTRATION" : "REVIEW_FOR_REGISTRATION";
    return {
      keyRef: keyRef(item.bucket, item.objectKey), bucket: item.bucket, objectKey: item.objectKey, urlKeys,
      observed: object ? { byteSize: object.size, etag: object.etag ?? null, lastModified: object.lastModified ?? null } : null,
      registeredFileId: file?.id ?? null, registeredAssetId: file?.assetId ?? null,
      decision, reviews, expectedUsages: item.usages.sort((a, b) => a.source.localeCompare(b.source)),
      externalSources: [...item.externalSources].sort(), possibleSources: [...item.possibleSources].sort(),
      // No kind/owner/verification values are inferred from an extension or editor ID.
      proposedAsset: !file && inScope ? { layout: "LEGACY", scope: "UNCLASSIFIED", ownerUserId: null, retentionHold: item.externalSources.size || item.possibleSources.size ? "LEGACY_REFERENCE_REVIEW" : null } : null,
      requiredVerification: !file && inScope ? ["FRESH_SOURCE_VERSION", "EXACT_BUCKET_KEY", "CONTENT_HASH_AND_DECODE", "LEGACY_ACCESS_PARITY", "TRANSACTIONAL_USAGE_AND_AUDIT"] : [],
      applyAllowed: false as const, deletionAllowed: false as const,
    };
  }).sort((a, b) => a.keyRef.localeCompare(b.keyRef));
  const byDecision: Record<string, number> = {};
  for (const item of planned) byDecision[item.decision] = (byDecision[item.decision] ?? 0) + 1;
  return {
    version: 1, mode: "OFFLINE_BACKFILL_REVIEW", applyAllowed: false, deletionAuthorized: false,
    inputs: audit.inputs, inventoryWindow: audit.inventoryWindow, databaseWindow: audit.databaseWindow,
    coverageReview: { issues: snapshot.issues, unknownColumns: snapshot.coverage.unknownColumns, excludedTables: snapshot.coverage.excludedTables },
    summary: { objectsListed: inventory.objects.length, entries: planned.length, expectedUsageRows: planned.reduce((n, e) => n + e.expectedUsages.length, 0), byDecision },
    entries: planned,
    limitations: ["NOT_AN_EXECUTABLE_IMPORT", "NO_CONTENT_VERIFICATION", "NO_OWNERSHIP_ASSIGNMENT", "FRESH_SOURCE_AND_INVENTORY_REQUIRED_BEFORE_APPLY", "EXTERNAL_ACCESS_MUST_NOT_CHANGE_ON_REGISTRATION"],
  };
}
