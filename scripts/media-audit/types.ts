import type { MediaReference } from "../../src/lib/media/body-references";

export type AuditConfig = {
  appOrigin: string;
  publicBaseUrl?: string;
  proxyOrigins?: string[];
  publicBaseUrls?: string[];
  // Explicit, reviewed logical URL key -> actual storage location. Never guessed.
  keyAliases?: { urlKey: string; bucket: string; objectKey: string }[];
};
export type Issue = { code: string; source?: string; assetId?: string; fileId?: string; keyRef?: string };
export type AuditSource = {
  source: string;
  target?: { contentId: string } | { coachingSessionId: string };
  bodyVersion?: string;
  editorCandidateIds: string[];
  groups: MediaReference[][];
  // Supplemental literal matches are holds for review, not confirmed usages.
  possibleKeys: string[];
};
export type Asset = {
  id: string; scope: string; ownerUserId: string | null; layout: string;
  libraryStatus: string; storageStatus: string; retentionHold: boolean;
};
export type File = {
  id: string; assetId: string; bucket: string; objectKey: string; urlKey: string;
  status: string; role: string; byteSize: string | null; verified: boolean;
};
export type Usage = { assetId: string; contentId: string | null; coachingSessionId: string | null; occurrenceCount: number };
export type Snapshot = {
  version: 1;
  startedAt: string; finishedAt: string; databaseSnapshot: string;
  configHash: string;
  mediaSchema: "ABSENT" | "PRESENT" | "PARTIAL";
  sources: AuditSource[]; assets: Asset[]; files: File[]; usages: Usage[];
  contexts: { lessons: { id: string; courseId: string; editorId: string }[]; sessions: { id: string; editorId: string }[] };
  coverage: { scanned: { table: string; columns: string[]; rows: number }[]; excludedTables: string[]; unknownColumns: string[] };
  issues: Issue[];
};
export type Inventory = {
  version: 1; bucket: string; startedAt: string; finishedAt: string;
  complete: boolean; prefix: "";
  objects: { key: string; size: string; etag?: string; lastModified?: string }[];
};
