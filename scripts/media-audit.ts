import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { parse } from "dotenv";
import { Client } from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { readSnapshot } from "./media-audit/database";
import { readInventory } from "./media-audit/storage";
import { validateConfig } from "./media-audit/references";
import { reconcile, renderSummary } from "./media-audit/reconcile";
import type { AuditConfig, Inventory, Snapshot } from "./media-audit/types";

const HELP = `읽기 전용 미디어 대조 (DB/R2 쓰기·삭제 없음)

오프라인 재분석:
  npm run media:audit -- --config config.json --snapshot snapshot.json --inventory inventory.json --out .media-audit/review

명시적으로 지정한 DB/R2 읽기:
  npm run media:audit -- --live --config config.json --env-file /secure/audit.env --out .media-audit/run

필수 live 환경변수 (기존 .env 자동 로드 없음):
  MEDIA_AUDIT_DATABASE_URL
  MEDIA_AUDIT_R2_BUCKET
  MEDIA_AUDIT_R2_ENDPOINT
  MEDIA_AUDIT_R2_ACCESS_KEY_ID
  MEDIA_AUDIT_R2_SECRET_ACCESS_KEY

config 형식·출력·제한: docs/media-audit-runbook.md
출력 디렉터리는 새 경로여야 합니다. 결과에 내부 ID와 객체 key가 포함됩니다.
`;

async function readJson<T>(file: string): Promise<T> {
  if ((await fs.stat(file)).size > 128 * 1024 * 1024) throw new Error("INPUT_FILE_TOO_LARGE");
  return JSON.parse(await fs.readFile(file, "utf8")) as T;
}

async function main() {
  const { values } = parseArgs({ options: {
    help: { type: "boolean" }, live: { type: "boolean" }, config: { type: "string" },
    snapshot: { type: "string" }, inventory: { type: "string" }, out: { type: "string" }, "env-file": { type: "string" },
  } });
  if (values.help) { console.log(HELP); return; }
  if (!values.config || !values.out || (values.live ? Boolean(values.snapshot || values.inventory) : !values.snapshot || !values.inventory || Boolean(values["env-file"]))) {
    throw new Error("INVALID_OPTIONS_USE_HELP");
  }
  const config = validateConfig(await readJson<AuditConfig>(values.config));
  const out = path.resolve(values.out);
  await fs.mkdir(path.dirname(out), { recursive: true, mode: 0o700 });
  // Exclusive new directory: never overwrite previous evidence or follow an existing symlink.
  await fs.mkdir(out, { mode: 0o700 });
  const write = (name: string, data: unknown) => fs.writeFile(path.join(out, name), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  let stage = "INPUT";
  try {
    let snapshot: Snapshot, inventory: Inventory;
    if (values.live) {
      const env = { ...process.env, ...(values["env-file"] ? parse(await fs.readFile(values["env-file"], "utf8")) : {}) };
      const required = (name: string) => {
        const value = env[`MEDIA_AUDIT_${name}`];
        if (!value) throw new Error("AUDIT_ENV_MISSING");
        return value;
      };
      const endpoint = required("R2_ENDPOINT");
      const parsed = new URL(endpoint);
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".r2.cloudflarestorage.com") || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("INVALID_R2_ENDPOINT");
      const connectionString = required("DATABASE_URL");
      const bucket = required("R2_BUCKET");
      const s3 = new S3Client({
        region: "auto", endpoint, forcePathStyle: true, maxAttempts: 3,
        credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
        requestHandler: { connectionTimeout: 10000, requestTimeout: 30000 },
      });
      stage = "R2_LIST";
      try { inventory = await readInventory(s3, bucket); } finally { s3.destroy(); }
      // Do not keep a database transaction open across R2 pagination.
      const db = new Client({ connectionString, connectionTimeoutMillis: 10000, application_name: "glia-media-readonly-audit" });
      stage = "DB_SCAN";
      try { await db.connect(); snapshot = await readSnapshot(db, config); } finally { await db.end(); }
    } else {
      snapshot = await readJson<Snapshot>(values.snapshot!);
      inventory = await readJson<Inventory>(values.inventory!);
    }
    stage = "RECONCILE";
    const report = reconcile(snapshot, inventory, config);
    stage = "WRITE_REPORT";
    await write("snapshot.json", snapshot);
    await write("inventory.json", inventory);
    await write("report.json", report);
    await write("summary.md", renderSummary(report));
    // Written last; an interrupted output directory is not a complete report.
    await write("manifest.json", { version: 1, complete: true, inputs: report.inputs, deletionAuthorized: false });
    console.log(JSON.stringify({ output: out, ...report.summary, deletionAuthorized: false }));
  } catch (error) {
    const e = error as { code?: unknown; message?: unknown };
    const code = typeof e.code === "string" && /^[A-Z0-9_]+$/.test(e.code) ? e.code
      : typeof e.message === "string" && /^[A-Z0-9_]+$/.test(e.message) ? e.message : "AUDIT_FAILED";
    const failure = { complete: false, stage, code, deletionAuthorized: false };
    await write("FAILED.json", failure).catch(() => undefined);
    console.error(JSON.stringify(failure));
    process.exitCode = 1;
  }
}

main().catch(() => {
  // Never echo connection strings, credentials, presigned URLs, bodies or SDK errors.
  console.error("미디어 대조를 시작하지 못했습니다. --help와 입력 형식·출력 경로를 확인하세요.");
  process.exitCode = 1;
});
