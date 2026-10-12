import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createCleanupStore, assertIsolatedCleanupBucket } from "../src/lib/media/cleanup-store";
import { runMediaCleanup } from "../src/lib/media/cleanup-worker";
import { postgresUtcConfig } from "../src/lib/postgres-utc";

const HELP = `미디어 정리 worker — 기본은 후보 조회만 수행합니다.
  npm run media:cleanup -- --env-file /secure/cleanup.env
  npm run media:cleanup -- --env-file /secure/cleanup.env --apply --confirm-bucket glia-test

환경변수: MEDIA_CLEANUP_DATABASE_URL, MEDIA_CLEANUP_R2_BUCKET
apply 추가: MEDIA_CLEANUP_ENVIRONMENT=isolated,
  MEDIA_CLEANUP_R2_ENDPOINT, MEDIA_CLEANUP_R2_ACCESS_KEY_ID, MEDIA_CLEANUP_R2_SECRET_ACCESS_KEY

기존 .env 자동 로드 없음. 버킷 이름은 -dev 또는 -test로 끝나야 합니다.
apply DB는 loopback의 media_cleanup_ 접두사 DB만 허용합니다.
--limit 1..100 (각 작업군 후보 수, 기본 25), --help
운영/LEGACY 삭제·자동 스케줄은 지원하지 않습니다. docs/media-cleanup-runbook.md 참고.
`;

async function main() {
  const { values } = parseArgs({ options: { help: { type: "boolean" }, apply: { type: "boolean" }, "env-file": { type: "string" }, "confirm-bucket": { type: "string" }, limit: { type: "string" } } });
  if (values.help) { console.log(HELP); return; }
  const env = { ...process.env, ...(values["env-file"] ? parse(await readFile(values["env-file"], "utf8")) : {}) };
  const required = (name: string) => {
    const value = env[`MEDIA_CLEANUP_${name}`];
    if (!value) throw new Error("CLEANUP_ENV_MISSING");
    return value;
  };
  const connectionString = required("DATABASE_URL"); const bucket = required("R2_BUCKET");
  assertIsolatedCleanupBucket(bucket);
  const limit = values.limit === undefined ? 25 : Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("CLEANUP_LIMIT_INVALID");
  if (values.apply) {
    const dbUrl = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(dbUrl.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(dbUrl.hostname) || !/^\/media_cleanup_[a-z0-9_]+$/.test(dbUrl.pathname) || dbUrl.search || dbUrl.hash || env.MEDIA_CLEANUP_ENVIRONMENT !== "isolated" || values["confirm-bucket"] !== bucket) throw new Error("CLEANUP_APPLY_NOT_ISOLATED");
  } else if (values["confirm-bucket"]) throw new Error("CLEANUP_OPTIONS_INVALID");
  const storage = values.apply ? createCleanupStore({ bucket, endpoint: required("R2_ENDPOINT"), accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") }) : null;
  const db = new PrismaClient({ adapter: new PrismaPg(postgresUtcConfig({ connectionString, connectionTimeoutMillis: 10000, application_name: "glia-media-isolated-cleanup" })) });
  try {
    const report = await runMediaCleanup(db, { bucket, limit, mode: values.apply ? "apply-isolated" : "dry-run", store: storage?.store });
    console.log(JSON.stringify(report));
    if (report.results.some(r => ["RETRY", "LOST_CLAIM", "WORKER_FAILED", "STORAGE_FAILED", "OBJECT_PRESENT"].includes(r.outcome))) process.exitCode = 1;
  } finally { await db.$disconnect(); storage?.close(); }
}

main().catch(() => {
  // Configuration and SDK/DB errors may contain credentials. Keep stdout/stderr redacted.
  console.error("미디어 정리를 완료하지 못했습니다. --help와 격리 환경 설정을 확인하세요.");
  process.exitCode = 1;
});
