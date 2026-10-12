import type { Asset, AuditConfig, AuditSource, File, Inventory, Issue, Snapshot } from "./types";
import { configHash, fingerprint, keyRef, validateConfig } from "./references";

const targetKey = (source: AuditSource) => source.target && ("contentId" in source.target ? `contents:${source.target.contentId}` : `coaching_sessions:${source.target.coachingSessionId}`);
const identity = (bucket: string, key: string) => JSON.stringify([bucket, key]);
const usageKey = (source: string, assetId: string) => JSON.stringify([source, assetId]);
const inScope = (key: string) => /^(?:courses\/[^/]+\/lessons\/[^/]+\/(?:images|videos|audio)\/|coaching\/[^/]+\/(?:images|videos|audio)\/|media\/(?:shared|personal)\/)/.test(key);

export function reconcile(snapshot: Snapshot, inventory: Inventory, config: AuditConfig) {
  validateConfig(config);
  if (snapshot.version !== 1 || inventory.version !== 1 || inventory.prefix !== "" || typeof inventory.bucket !== "string" || !inventory.bucket || typeof inventory.complete !== "boolean") throw new Error("UNSUPPORTED_AUDIT_INPUT");
  for (const time of [snapshot.startedAt, snapshot.finishedAt, inventory.startedAt, inventory.finishedAt]) {
    if (typeof time !== "string" || !Number.isFinite(Date.parse(time))) throw new Error("INVALID_AUDIT_WINDOW");
  }
  if (Date.parse(snapshot.startedAt) > Date.parse(snapshot.finishedAt) || Date.parse(inventory.startedAt) > Date.parse(inventory.finishedAt)) throw new Error("INVALID_AUDIT_WINDOW");
  if (snapshot.configHash !== configHash(config)) throw new Error("AUDIT_CONFIG_MISMATCH");
  const issues: Issue[] = [...snapshot.issues];
  if (!inventory.complete) issues.push({ code: "INVENTORY_INCOMPLETE" });
  const aliases = new Map((config.keyAliases ?? []).map(row => [row.urlKey, row]));
  const assets = new Map<string, Asset>();
  const filesByUrl = new Map<string, File>();
  const filesByObject = new Map<string, File>();
  const filesByAsset = new Map<string, File[]>();
  // Only registered URL keys and explicitly reviewed aliases supply logical paths.
  // Never strip a bucket/prefix heuristically from an observed physical key.
  const logicalKeysByObject = new Map<string, Set<string>>();
  const addLogicalKey = (bucket: string, objectKey: string, urlKey: string) => {
    const object = identity(bucket, objectKey);
    if (!logicalKeysByObject.has(object)) logicalKeysByObject.set(object, new Set());
    logicalKeysByObject.get(object)!.add(urlKey);
  };
  for (const alias of aliases.values()) addLogicalKey(alias.bucket, alias.objectKey, alias.urlKey);
  const lessonContexts = new Map(snapshot.contexts.lessons.map(row => [identity(row.courseId, row.id), row]));
  const sessionContexts = new Map(snapshot.contexts.sessions.map(row => [row.id, row]));
  for (const asset of snapshot.assets) {
    if (assets.has(asset.id)) throw new Error("DUPLICATE_SNAPSHOT_ASSET");
    assets.set(asset.id, asset);
  }
  for (const file of snapshot.files) {
    const key = identity(file.bucket, file.objectKey);
    if (filesByUrl.has(file.urlKey) || filesByObject.has(key)) throw new Error("DUPLICATE_SNAPSHOT_FILE");
    filesByUrl.set(file.urlKey, file); filesByObject.set(key, file);
    addLogicalKey(file.bucket, file.objectKey, file.urlKey);
    if (!filesByAsset.has(file.assetId)) filesByAsset.set(file.assetId, []);
    filesByAsset.get(file.assetId)!.push(file);
    const alias = aliases.get(file.urlKey);
    if (alias && (alias.bucket !== file.bucket || alias.objectKey !== file.objectKey)) throw new Error("ALIAS_CONFLICTS_WITH_REGISTERED_FILE");
  }
  const observations = new Map<string, { key: string; size: string; etag?: string; lastModified?: string }>();
  for (const item of inventory.objects) {
    if (typeof item.key !== "string" || !/^\d+$/.test(item.size) || observations.has(item.key)) throw new Error("INVALID_OR_DUPLICATE_INVENTORY_OBJECT");
    observations.set(item.key, item);
  }
  const referenced = new Map<string, Set<string>>();
  const potential = new Map<string, Set<string>>();
  const external = new Set<string>();
  const expected = new Map<string, number>();
  const sourceIds = new Set<string>();
  const editorCandidates = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, object: string, source: string) => {
    if (!map.has(object)) map.set(object, new Set());
    map.get(object)!.add(source);
  };
  const location = (key: string) => filesByUrl.get(key) ?? aliases.get(key) ?? { bucket: inventory.bucket, objectKey: key };
  function observeKey(key: string, source: AuditSource, possible: boolean) {
    const loc = location(key);
    const object = identity(loc.bucket, loc.objectKey);
    add(possible ? potential : referenced, object, source.source);
    if (!source.target) external.add(object);
    if (!editorCandidates.has(object)) editorCandidates.set(object, new Set());
    source.editorCandidateIds.forEach(id => editorCandidates.get(object)!.add(id));
    if (aliases.has(key)) issues.push({ code: "EXPLICIT_ALIAS_USED", source: source.source, keyRef: keyRef(loc.bucket, loc.objectKey) });
    if (loc.bucket !== inventory.bucket) issues.push({ code: "BUCKET_NOT_SCANNED", source: source.source, keyRef: keyRef(loc.bucket, loc.objectKey) });
    else if (inventory.complete && !observations.has(loc.objectKey)) issues.push({ code: "REFERENCED_OBJECT_NOT_LISTED", source: source.source, keyRef: keyRef(loc.bucket, loc.objectKey) });
    if (!filesByObject.has(object)) issues.push({ code: "UNREGISTERED_REFERENCE", source: source.source, keyRef: keyRef(loc.bucket, loc.objectKey) });
    else if (!filesByUrl.has(key) && !aliases.has(key)) issues.push({ code: "UNREGISTERED_URL_ALIAS", source: source.source, keyRef: keyRef(loc.bucket, loc.objectKey) });
    return filesByObject.get(object);
  }
  for (const source of snapshot.sources) {
    if (sourceIds.has(source.source)) throw new Error("DUPLICATE_SNAPSHOT_SOURCE");
    sourceIds.add(source.source);
    const target = targetKey(source);
    const sourceCounts = new Map<string, number>();
    for (const group of source.groups) {
      const counts = new Map<string, number>();
      for (const ref of group) {
        const file = ref.key ? observeKey(ref.key, source, false) : undefined;
        const id = ref.assetId ?? file?.assetId;
        if (ref.assetId && file && file.assetId !== ref.assetId) issues.push({ code: "ASSET_URL_MISMATCH", source: source.source, assetId: ref.assetId, fileId: file.id });
        if (file && (file.status !== "READY" || !file.verified)) issues.push({ code: "REFERENCE_FILE_NOT_READY", source: source.source, fileId: file.id });
        if (id) {
          if (!assets.has(id)) issues.push({ code: "UNKNOWN_ASSET_REFERENCE", source: source.source, assetId: id });
          else if (assets.get(id)!.storageStatus !== "READY") issues.push({ code: "REFERENCE_ASSET_NOT_READY", source: source.source, assetId: id });
          if (!ref.key) {
            // assetId-only references protect every registered file of that asset.
            for (const f of filesByAsset.get(id) ?? []) {
              const object = identity(f.bucket, f.objectKey);
              add(referenced, object, source.source);
              if (!source.target) external.add(object);
            }
          }
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      for (const [id, count] of counts) sourceCounts.set(id, Math.max(sourceCounts.get(id) ?? 0, count));
    }
    for (const key of source.possibleKeys) observeKey(key, source, true);
    if (target) for (const [id, count] of sourceCounts) expected.set(usageKey(target, id), count);
  }
  const actual = new Map<string, number>();
  for (const usage of snapshot.usages) {
    if (Boolean(usage.contentId) === Boolean(usage.coachingSessionId) || usage.occurrenceCount < 1) throw new Error("INVALID_SNAPSHOT_USAGE");
    const source = usage.contentId ? `contents:${usage.contentId}` : `coaching_sessions:${usage.coachingSessionId}`;
    const key = usageKey(source, usage.assetId);
    if (actual.has(key)) throw new Error("DUPLICATE_SNAPSHOT_USAGE");
    actual.set(key, usage.occurrenceCount);
  }
  const usageDifferences = [...new Set([...actual.keys(), ...expected.keys()])].sort().flatMap(key => {
    if (actual.get(key) === expected.get(key)) return [];
    const [source, assetId] = JSON.parse(key) as [string, string];
    const code = !actual.has(key) ? "USAGE_MISSING" : !expected.has(key) ? "USAGE_NOT_IN_PARSED_BODY" : "USAGE_COUNT_MISMATCH";
    issues.push({ code, source, assetId });
    return [{ code, source, assetId, actual: actual.get(key) ?? 0, expected: expected.get(key) ?? 0 }];
  });
  for (const file of snapshot.files) {
    if (!assets.has(file.assetId)) issues.push({ code: "FILE_ASSET_MISSING", fileId: file.id });
    if (file.bucket !== inventory.bucket) issues.push({ code: "BUCKET_NOT_SCANNED", fileId: file.id });
    else if (inventory.complete && !observations.has(file.objectKey) && file.status === "READY") issues.push({ code: "READY_OBJECT_NOT_LISTED", fileId: file.id, keyRef: keyRef(file.bucket, file.objectKey) });
  }
  const objects = [...observations.values()].sort((a, b) => a.key < b.key ? -1 : 1).map(item => {
    const object = identity(inventory.bucket, item.key);
    const file = filesByObject.get(object);
    const asset = file ? assets.get(file.assetId) : undefined;
    const references = [...(referenced.get(object) ?? [])].sort();
    const possibleReferences = [...(potential.get(object) ?? [])].sort();
    const candidates = editorCandidates.get(object) ?? new Set<string>();
    const logicalKeys = new Set([item.key, ...(logicalKeysByObject.get(object) ?? [])]);
    const scoped = [...logicalKeys].some(inScope);
    const flags: string[] = [];
    for (const key of logicalKeys) {
      const coaching = key.match(/^coaching\/([^/]+)\//);
      const lesson = key.match(/^courses\/([^/]+)\/lessons\/([^/]+)\//);
      const context = coaching ? sessionContexts.get(coaching[1]) : lesson ? lessonContexts.get(identity(lesson[1], lesson[2])) : undefined;
      if (context) candidates.add(context.editorId);
      if ((coaching || lesson) && !context && !flags.includes("CONTEXT_NOT_FOUND")) flags.push("CONTEXT_NOT_FOUND");
    }
    if (external.has(object)) flags.push("OUTSIDE_CONTENT_CONSUMER");
    if (possibleReferences.length) flags.push("POSSIBLE_REFERENCE_REVIEW");
    if (asset?.scope === "UNCLASSIFIED" || (!asset && scoped)) flags.push("OWNER_UNCONFIRMED");
    if (asset?.retentionHold) flags.push("RETENTION_HOLD");
    if (file?.status === "DELETED" || file?.status === "RETIRED") flags.push("OBJECT_REMAINS_AFTER_RETIREMENT");
    if (file?.byteSize !== null && file?.byteSize !== undefined && file.byteSize !== item.size) flags.push("SIZE_MISMATCH");
    if (external.has(object) && asset && !asset.retentionHold) flags.push("HOLD_RECOMMENDED");
    const observedClass = references.length ? "REFERENCED" : possibleReferences.length ? "POSSIBLY_REFERENCED"
      : asset?.libraryStatus === "ACTIVE" ? "LIBRARY_STORED"
      : item.key.startsWith("media/staging/") ? "STAGING_OBSERVED"
      : !scoped ? "OUT_OF_SCOPE" : "NO_REFERENCE_OBSERVED";
    return {
      keyRef: keyRef(inventory.bucket, item.key), objectKey: item.key, size: item.size,
      fileId: file?.id, assetId: asset?.id, scope: asset?.scope,
      ownerUserId: asset?.ownerUserId ?? null, editorCandidateIds: [...candidates].filter(Boolean).sort(),
      ownershipConfirmed: Boolean(asset && asset.scope !== "UNCLASSIFIED"),
      observedClass, flags, references, possibleReferences, deletionEligible: false as const,
    };
  });
  for (const item of objects) for (const code of item.flags) issues.push({ code, keyRef: item.keyRef, assetId: item.assetId });
  const uniqueIssues = [...new Map(issues.map(issue => [JSON.stringify(issue), issue])).values()];
  const byCode: Record<string, number> = {};
  uniqueIssues.forEach(issue => { byCode[issue.code] = (byCode[issue.code] ?? 0) + 1; });
  return {
    version: 1, mode: "READ_ONLY_RECONCILIATION", deletionAuthorized: false,
    inventoryWindow: { startedAt: inventory.startedAt, finishedAt: inventory.finishedAt, complete: inventory.complete },
    databaseWindow: { startedAt: snapshot.startedAt, finishedAt: snapshot.finishedAt, snapshot: snapshot.databaseSnapshot },
    inputs: { snapshotSha256: fingerprint(JSON.stringify(snapshot)), inventorySha256: fingerprint(JSON.stringify(inventory)), configSha256: configHash(config) },
    mediaSchema: snapshot.mediaSchema, coverage: snapshot.coverage,
    summary: { objects: objects.length, bytes: objects.reduce((sum, item) => sum + BigInt(item.size), BigInt(0)).toString(), sources: snapshot.sources.length, registeredFiles: snapshot.files.length, usageDifferences: usageDifferences.length, issues: uniqueIssues.length, byCode },
    objects, usageDifferences, issues: uniqueIssues,
    limitations: ["DB_AND_R2_ARE_NOT_ONE_ATOMIC_SNAPSHOT", "LISTING_DOES_NOT_VERIFY_BYTES_OR_PLAYABILITY", "EDITOR_IS_NOT_PROVEN_OWNER", "NO_REFERENCE_IS_NOT_DELETION_PERMISSION", "EXCLUDED_AND_UNKNOWN_SOURCES_REQUIRE_REVIEW"],
  };
}

export function renderSummary(report: ReturnType<typeof reconcile>) {
  const lines = ["# 미디어 참조 대조 결과", "", "읽기 전용 조사입니다. 이 보고서는 삭제 승인이나 파일 내용 검증 결과가 아닙니다.", "",
    `- 관측 객체: ${report.summary.objects}개 / ${report.summary.bytes} bytes`,
    `- 확인한 본문·필드: ${report.summary.sources}개`,
    `- 등록 파일: ${report.summary.registeredFiles}개`,
    `- 사용처 불일치: ${report.summary.usageDifferences}건`,
    `- 미디어 테이블: ${report.mediaSchema}`, `- R2 전체 목록 수집: ${report.inventoryWindow.complete ? "완료" : "미완료"}`, "",
    "## 검토 항목", ""];
  for (const [code, count] of Object.entries(report.summary.byCode).sort()) lines.push(`- ${code}: ${count}건`);
  if (!report.summary.issues) lines.push("검사 범위 안에서 불일치가 관측되지 않았습니다.");
  lines.push("", "DB와 R2의 관측 시각은 다릅니다. 소유자 확정, 범위 밖 소비자 검토, 내용 검증과 변경분 재대조 후에 이관 여부를 결정합니다. 본문에서 참조가 관측되지 않아도 보관 의사나 삭제 자격을 추정하지 않습니다.", "", "상세 위치와 입력 지문은 report.json, snapshot.json, inventory.json에 있습니다. 해당 파일에는 내부 식별자와 객체 경로가 포함되므로 제한된 개발·운영 검토용으로 취급합니다.", "");
  return lines.join("\n");
}
