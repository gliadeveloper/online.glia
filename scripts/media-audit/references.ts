import { createHash } from "node:crypto";
import { extractMediaReferences, mediaUrlKey } from "../../src/lib/media/body-references";
import { mediaBodyVersion, type MediaBody } from "../../src/lib/media/body-version";
import type { AuditConfig, AuditSource, Issue } from "./types";

export const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex");
export const keyRef = (bucket: string, key: string) => fingerprint(JSON.stringify([bucket, key]));
export const configHash = (config: AuditConfig) => fingerprint(JSON.stringify(config));

export function validateConfig(config: AuditConfig): AuditConfig {
  const exactOrigin = (value: string) => {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("INVALID_AUDIT_ORIGIN");
  };
  exactOrigin(config.appOrigin);
  for (const origin of config.proxyOrigins ?? []) exactOrigin(origin);
  for (const value of [config.publicBaseUrl, ...(config.publicBaseUrls ?? [])].filter((s): s is string => Boolean(s))) {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("INVALID_PUBLIC_BASE_URL");
  }
  const seen = new Set<string>();
  for (const alias of config.keyAliases ?? []) {
    if (!alias.urlKey || !alias.bucket || !alias.objectKey || seen.has(alias.urlKey)) throw new Error("INVALID_OR_DUPLICATE_KEY_ALIAS");
    seen.add(alias.urlKey);
  }
  return config;
}

export function auditResolver(config: AuditConfig, issues: Issue[], source: string) {
  const combinations = [
    { appOrigin: config.appOrigin, publicBaseUrl: config.publicBaseUrl },
    ...(config.proxyOrigins ?? []).map(appOrigin => ({ appOrigin })),
    ...(config.publicBaseUrls ?? []).map(publicBaseUrl => ({ appOrigin: config.appOrigin, publicBaseUrl })),
  ];
  return (value: string) => {
    try {
      for (const pair of combinations) {
        const key = mediaUrlKey(value, pair);
        if (key !== null) return key;
      }
      const parsed = new URL(value, config.appOrigin);
      if (parsed.pathname === "/api/media/r2" || parsed.hostname.endsWith(".r2.dev")) {
        issues.push({ code: "UNKNOWN_MEDIA_ORIGIN", source });
      }
    } catch {
      issues.push({ code: "INVALID_MEDIA_URL", source });
    }
    return null;
  };
}

export async function inspectSource(
  source: string, body: MediaBody, config: AuditConfig, issues: Issue[],
  target?: AuditSource["target"], editorCandidateIds: string[] = [],
  extra?: unknown,
): Promise<AuditSource> {
  const resolve = auditResolver(config, issues, source);
  let groups: AuditSource["groups"] = [];
  try { groups = extractMediaReferences(body, config, resolve); }
  catch { issues.push({ code: "BODY_PARSE_FAILED", source }); }
  const possibleKeys = new Set<string>();
  let visits = 0;
  function scan(value: unknown, depth = 0) {
    if (++visits > 20000 || depth > 64) throw new Error("SCAN_LIMIT");
    if (typeof value === "string") {
      if (value.length > 2_000_000) throw new Error("SCAN_LIMIT");
      if (/^(?:courses|coaching|media|avatars|community|lesson-qna)\/[^\s]+$/.test(value)) possibleKeys.add(value);
      // Conservative: raw text/code/srcset/custom metadata may contain a reference.
      // These are never promoted into confirmed MediaUsage counts.
      for (const match of value.matchAll(/(?:https?:\/\/|\/api\/media\/r2\?)[^\s<>"'`()\[\]]+/g)) {
        const key = resolve(match[0].replace(/&amp;/g, "&"));
        if (key) possibleKeys.add(key);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) scan(item, depth + 1);
    } else if (value && typeof value === "object") {
      for (const item of Object.values(value)) scan(item, depth + 1);
    }
  }
  try { scan([body, extra]); }
  catch { issues.push({ code: "SUPPLEMENTAL_SCAN_INCOMPLETE", source }); }
  const confirmed = new Set(groups.flat().flatMap(ref => ref.key ? [ref.key] : []));
  for (const key of confirmed) possibleKeys.delete(key);
  return {
    source, target, editorCandidateIds: [...new Set(editorCandidateIds)].sort(), groups,
    possibleKeys: [...possibleKeys].sort(),
    ...(target ? { bodyVersion: await mediaBodyVersion(body) } : {}),
  };
}
