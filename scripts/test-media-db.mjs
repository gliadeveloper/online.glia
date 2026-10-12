// Isolated database integration tests. Never uses the application's database URL.
// Requires local initdb/postgres/pg_ctl binaries and a generated Prisma Client.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cp from "node:child_process";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { postgresUtcConfig } from "../src/lib/postgres-utc.ts";
// Install before any audit/parser import indirectly loads Next request stores.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Keep Unix socket paths short on macOS. mkdtemp creates a private directory.
const root = fs.mkdtempSync(path.join(fs.realpathSync("/tmp"), "media-db-"));
const data = path.join(root, "data");
const results = [];
let started = false;
const config = { host: root, port: 55467, user: os.userInfo().username,
    database: "postgres", connectionTimeoutMillis: 1500 };
const migrationName = "20261007090000_media_asset_foundation";
const migrations = path.join(repo, "prisma/migrations");
const schemaPath = path.join(repo, "prisma/schema.prisma");
const cli = path.join(repo, "node_modules/prisma/build/index.js");
const pgBinary = name => process.env.MEDIA_TEST_PG_BIN ? path.join(process.env.MEDIA_TEST_PG_BIN, name) : name;
function run(binary, args) {
    return cp.execFileSync(binary, args, { cwd: root, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
}
function prismaConfig(name, schema, migrationPath) {
    const file = path.join(root, name + ".config.ts");
    const url = `postgresql://${encodeURIComponent(config.user)}@localhost:${config.port}/postgres?host=${encodeURIComponent(root)}`;
    fs.writeFileSync(file, `import { defineConfig } from ${JSON.stringify(path.join(repo, "node_modules/prisma/config.js"))};
export default defineConfig(${JSON.stringify({ schema, migrations: { path: migrationPath }, datasource: { url } })});
`);
    return file;
}
async function check(name, fn) {
    try {
        await fn();
        results.push({ name, ok: true });
    }
    catch (error) {
        results.push({ name, ok: false, error: error.message });
    }
}
async function snapshot(c) {
    const tables = ["users", "courses", "modules", "lessons", "contents", "coaching_offerings", "coaching_entitlements", "coaching_sessions"];
    const state = {};
    for (const table of tables)
        state[table] = (await c.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY id`)).rows;
    return state;
}
async function prepareDatabase() {
    const policy = fs.readFileSync(path.join(repo, "docs/media-asset-database-design.md"), "utf8");
    const policySQL = [...policy.matchAll(/```sql\n([\s\S]*?)```/g)].map(m => m[1]).join("\n");
    const migration = fs.readFileSync(path.join(migrations, migrationName, "migration.sql"), "utf8");
    assert(policySQL.length > 1000 && migration.includes(policySQL), "policy SQL and migration differ");
    run(pgBinary("initdb"), ["-D", data, "--no-locale", "--encoding=UTF8", "--auth=trust"]);
    run(pgBinary("pg_ctl"), ["-D", data, "-l", path.join(root, "postgres.log"), "-o", `-h '' -k ${root} -p ${config.port} -c unix_socket_permissions=0700`, "start", "-w", "-t", "10"]);
    started = true;
    const previous = path.join(root, "previous-migrations");
    fs.mkdirSync(previous);
    for (const name of fs.readdirSync(migrations)) {
        if (name !== migrationName)
            fs.cpSync(path.join(migrations, name), path.join(previous, name), { recursive: true });
    }
    // Reconstruct the preceding datamodel only to compare pre-existing drift.
    const previousSchema = path.join(root, "previous.prisma");
    const schema = fs.readFileSync(schemaPath, "utf8");
    fs.writeFileSync(previousSchema, schema.replace(/^model Media(?:Asset|File|Usage|Upload|DeletionJob) \{[\s\S]*?^\}\n/gm, "")
        .replace(/^  \w+ +Media(?:Asset|File|Usage|Upload|DeletionJob)[^\n]*\n/gm, ""));
    const beforeConfig = prismaConfig("before", previousSchema, previous);
    const afterConfig = prismaConfig("after", schemaPath, migrations);
    run(process.execPath, [cli, "migrate", "deploy", "--config", beforeConfig]);
    const baselineDrift = path.join(root, "baseline-drift.sql");
    run(process.execPath, [cli, "migrate", "diff", "--config", beforeConfig, "--from-config-datasource", "--to-schema", previousSchema, "--script", "--output", baselineDrift]);
    const c = await client();
    try {
        await c.query(`
      INSERT INTO users(id,email,role,"updatedAt") VALUES
        ('owner','owner@example.invalid','COACH',now()),
        ('teacher','teacher@example.invalid','COACH',now()),
        ('student','student@example.invalid','USER',now());
      INSERT INTO courses(id,title,"instructorId","updatedAt")
        VALUES('00000000-0000-4000-8000-000000000001','Fixture course','teacher',now());
      INSERT INTO modules(id,"courseId",title,"updatedAt")
        VALUES('module','00000000-0000-4000-8000-000000000001','Fixture module',now());
      INSERT INTO lessons(id,"moduleId",title,"updatedAt") VALUES('lesson','module','Fixture lesson',now());
      INSERT INTO contents(id,"lessonId",type,body) VALUES('c','lesson','HTML','Existing course body');
      INSERT INTO coaching_offerings(id,title,slug,"totalSessions","validDays","updatedAt")
        VALUES('offering','Fixture offering','fixture-offering',1,30,now());
      INSERT INTO coaching_entitlements(id,"userId","coachingOfferingId","totalSessions","validUntil","updatedAt")
        VALUES('entitlement','student','offering',1,now()+interval '30 days',now());
      INSERT INTO coaching_sessions(id,"entitlementId","coachId","userId","sessionNo",title,"scheduledAt","bodyMarkdown","updatedAt")
        VALUES('s','entitlement','teacher','student',1,'Fixture session',now(),'Existing coaching body',now());
    `);
        const before = await snapshot(c);
        const { runMediaAuditBeforeMigration } = await import("./media-audit.integration.ts");
        await runMediaAuditBeforeMigration(c, check);
        run(process.execPath, [cli, "migrate", "deploy", "--config", afterConfig]);
        await check("migration preserves existing course/coaching data", async () => assert.deepEqual(await snapshot(c), before));
        await check("migration history can be deployed a second time", async () => {
            const count = (await c.query("SELECT count(*) FROM _prisma_migrations")).rows;
            run(process.execPath, [cli, "migrate", "deploy", "--config", afterConfig]);
            assert.deepEqual((await c.query("SELECT count(*) FROM _prisma_migrations")).rows, count);
        });
        await check("migration adds only five empty media tables", async () => {
            const found = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'media_%' ORDER BY tablename")).rows.map(r => r.tablename);
            assert.deepEqual(found, ["media_assets", "media_deletion_jobs", "media_files", "media_uploads", "media_usages"]);
            for (const table of found)
                assert.equal((await c.query(`SELECT count(*) FROM ${table}`)).rows[0].count, "0");
        });
        await check("Prisma schema has no new drift after media migration", async () => {
            const afterDrift = path.join(root, "after-drift.sql");
            run(process.execPath, [cli, "migrate", "diff", "--config", afterConfig, "--from-config-datasource", "--to-schema", schemaPath, "--script", "--output", afterDrift]);
            assert.equal(fs.readFileSync(afterDrift, "utf8"), fs.readFileSync(baselineDrift, "utf8"));
        });
        return (await c.query("SHOW server_version")).rows[0].server_version;
    }
    finally {
        await c.end();
    }
}
async function clientChecks() {
    const prisma = new PrismaClient({ adapter: new PrismaPg(postgresUtcConfig(config)) });
    try {
        let asset;
        await check("Prisma nested reservation persists mapped fields and bigint", async () => {
            asset = await prisma.mediaAsset.create({ data: {
                    scope: "PERSONAL", ownerUserId: "owner", createdById: "teacher", kind: "AUDIO", originalName: "fixture.mp3", layout: "CANONICAL",
                    files: { create: { role: "ORIGINAL", bucket: "test", objectKey: "media/personal/owner/client-fixture/original.mp3", urlKey: "client-fixture",
                            upload: { create: { sourceKind: "CLIENT", requestedById: "owner", stagingObjectKey: "media/staging/client-fixture/source.mp3",
                                    expectedMimeType: "audio/mpeg", expectedByteSize: 9007199254740993n,
                                    uploadExpiresAt: new Date(Date.now() + 15 * 60000), deadlineAt: new Date(Date.now() + 86400000) } } } }
                }, include: { files: { include: { upload: true } }, owner: true } });
            assert.match(asset.id, /^c[a-z0-9]+$/);
            assert.equal(asset.files[0].upload.expectedByteSize, 9007199254740993n);
            assert.equal(asset.owner.id, "owner");
            assert(asset.createdAt instanceof Date);
            const read = await prisma.mediaUpload.findUnique({ where: { fileId: asset.files[0].id }, include: { file: { include: { asset: true } } } });
            assert.equal(read.file.asset.id, asset.id);
        });
        await check("Prisma deferred constraint failure rolls back orphan asset", async () => {
            await assert.rejects(prisma.mediaAsset.create({ data: { id: "orphan-client", scope: "SHARED", kind: "AUDIO", originalName: "x.mp3", layout: "LEGACY" } }), /requires exactly one original/);
            assert.equal(await prisma.mediaAsset.count({ where: { id: "orphan-client" } }), 0);
        });
        await check("Prisma stale token aborts all transaction changes", async () => {
            assert(asset, "nested reservation failed");
            await assert.rejects(prisma.$transaction(async (tx) => {
                await tx.mediaAsset.update({ where: { id: asset.id }, data: { originalName: "must-rollback" } });
                const result = await tx.mediaUpload.updateMany({ where: { id: asset.files[0].upload.id, phase: "PROMOTING", leaseToken: "stale", leaseExpiresAt: { gt: new Date() } }, data: { lastError: "must-rollback" } });
                if (result.count !== 1)
                    throw new Error("stale lease");
            }), /stale lease/);
            assert.equal((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).originalName, "fixture.mp3");
        });
    }
    finally {
        await prisma.$disconnect();
    }
}
async function client() {
    const c = new Client(config);
    await c.connect();
    await c.query("SET lock_timeout='4s'; SET statement_timeout='6s'");
    return c;
}
async function pending(c, a = 'a', extra = {}) {
    await c.query(`INSERT INTO media_assets(id,scope,owner_user_id,kind,original_name,layout) VALUES ($1,$2,$3,'AUDIO','example.mp3',$4)`, [a, extra.scope || 'SHARED', extra.owner || null, extra.layout || 'LEGACY']);
    await c.query(`INSERT INTO media_files(id,asset_id,role,bucket,object_key,url_key) VALUES ($1,$2,'ORIGINAL','b',$3,$3)`, ['f' + a, a, 'media/shared/' + a + '/original.mp3']);
}
async function verifyFile(c, f) {
    await c.query(`UPDATE media_files SET mime_type='audio/mpeg',byte_size=100,sha256=repeat('a',64),metadata_checked_at=now(),verified_at=now() WHERE id=$1`, [f]);
}
async function ready(c, a = 'a', extra = {}) {
    await pending(c, a, extra);
    await verifyFile(c, 'f' + a);
    await c.query("UPDATE media_files SET status='READY' WHERE id=$1", ['f' + a]);
    await c.query("UPDATE media_assets SET storage_status='READY' WHERE id=$1", [a]);
}
async function trash(c, a = 'a') {
    await c.query(`UPDATE media_assets SET library_status='TRASHED',trashed_at=now()-interval '40 days',trash_expires_at=now()-interval '10 days' WHERE id=$1`, [a]);
}
async function retire(c, a = 'a') {
    await c.query(`UPDATE media_files SET status='RETIRED',is_current=false,cleanup_requested_at=now(),next_sweep_at=now() WHERE asset_id=$1 AND status IN ('PENDING','READY')`, [a]);
}
async function deleting(c, a = 'a') {
    await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES($1,$2,now()) ON CONFLICT(asset_id) DO NOTHING", ['j' + a, a]);
    await c.query("UPDATE media_assets SET storage_status='DELETING' WHERE id=$1", [a]);
    await retire(c, a);
    await c.query("UPDATE media_deletion_jobs SET status='RUNNING',lease_token='delete-token',lease_expires_at=now()+interval '1 minute' WHERE asset_id=$1", [a]);
}
async function finishDeleted(c, a = 'a') {
    await c.query("UPDATE media_assets SET storage_status='DELETED' WHERE id=$1", [a]);
    await c.query("UPDATE media_deletion_jobs SET status='SUCCEEDED',completed_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE asset_id=$1", [a]);
}
async function deletedFiles(c, a = 'a') {
    await c.query("UPDATE media_files SET status='DELETED',last_absence_observed_at=now(),next_sweep_at=now()+interval '1 day' WHERE asset_id=$1 AND status='RETIRED'", [a]);
}
async function upload(c, a = 'a', role = 'ORIGINAL', suffix = '') {
    const fid = role === 'ORIGINAL' ? 'f' + a : 'd' + a + suffix;
    if (role !== 'ORIGINAL')
        await c.query(`INSERT INTO media_files(id,asset_id,role,bucket,object_key,url_key) VALUES ($1,$2,$3,'b',$4,$4)`, [fid, a, role, 'media/shared/' + a + '/derived/' + fid + '/playback.mp3']);
    await c.query(`INSERT INTO media_uploads(id,file_id,source_kind,staging_object_key,expected_mime_type,expected_byte_size,upload_expires_at,deadline_at) VALUES ($1,$2,$3,$4,'audio/mpeg',100,now()+interval '15 minutes',now()+interval '1 day')`, ['u' + fid, fid, role === 'ORIGINAL' ? 'CLIENT' : 'DERIVATION', 'media/staging/u' + fid + '/source.mp3']);
    return { u: 'u' + fid, f: fid };
}
async function validating(c, u) {
    await c.query("UPDATE media_uploads SET phase='VALIDATING',lease_token='token1',lease_expires_at=now()+interval '2 minutes' WHERE id=$1", [u]);
}
async function promoting(c, u, f) {
    await validating(c, u);
    await verifyFile(c, f);
    await c.query("UPDATE media_uploads SET phase='PROMOTING',source_etag='etag-a',validated_at=now() WHERE id=$1", [u]);
}
async function complete(c, u, f, a) {
    await c.query("UPDATE media_uploads SET phase='COMPLETED',completed_at=now(),staging_cleanup_due_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id=$1 AND lease_token='token1' AND lease_expires_at>clock_timestamp()", [u]);
    await c.query("UPDATE media_files SET status='READY' WHERE id=$1", [f]);
    await c.query("UPDATE media_assets SET storage_status='READY' WHERE id=$1", [a]);
}
async function abandon(c, u) {
    await c.query("UPDATE media_uploads SET phase='ABANDONED',abandoned_at=now(),staging_cleanup_due_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id=$1", [u]);
}
async function test(name, fn, reject) {
    const c = await client();
    let err;
    try {
        await c.query('BEGIN');
        await fn(c);
        await c.query('SET CONSTRAINTS ALL IMMEDIATE');
    }
    catch (e) {
        err = e;
    }
    finally {
        await c.query('ROLLBACK').catch(() => {
        });
        await c.end();
    }
    const ok = reject ? !!err && reject.test(err.message) : !err;
    results.push({ name, ok, ...(!ok ? { error: err?.message || 'unexpected acceptance' } : {}) });
}
async function race(name, fixture, first, second, expected) {
    const seed = await client();
    await seed.query('BEGIN');
    await fixture(seed);
    await seed.query('COMMIT');
    await seed.end();
    const a = await client(), b = await client();
    let err;
    try {
        await a.query('BEGIN');
        await b.query('BEGIN');
        await first(a);
        let ended = false;
        const waiting = second(b).then(v => {
            ended = true;
            return { v };
        }, e => {
            ended = true;
            return { e };
        });
        let blocked = false;
        for (let attempt = 0; attempt < 100 && !ended; attempt++) {
            const waitingOn = await a.query("SELECT pg_blocking_pids($1) AS pids", [b.processID]);
            if (waitingOn.rows[0].pids.includes(a.processID)) {
                blocked = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        await a.query('COMMIT');
        const outcome = await waiting;
        assert(blocked, 'second operation did not wait for asset lock');
        assert(outcome.e && expected.test(outcome.e.message), outcome.e?.message || 'race unexpectedly succeeded');
    }
    catch (e) {
        err = e;
    }
    finally {
        await a.query('ROLLBACK').catch(() => {
        });
        await b.query('ROLLBACK').catch(() => {
        });
        await a.end();
        await b.end();
    }
    results.push({ name, ok: !err, ...(err ? { error: err.message } : {}) });
}
async function main() {
    const version = await prepareDatabase();
    await test('valid pending asset + original', c => pending(c));
    await test('asset needs original at commit', c => c.query("INSERT INTO media_assets(id,scope,kind,original_name,layout) VALUES ('a','SHARED','AUDIO','a','CANONICAL')"), /exactly one original/);
    await test('asset cannot start READY', c => c.query("INSERT INTO media_assets(id,scope,kind,original_name,layout,storage_status) VALUES ('a','SHARED','AUDIO','a','CANONICAL','READY')"), /must start PENDING/);
    await test('normal original becomes READY', c => ready(c));
    await test('PERSONAL owner required', c => pending(c, 'a', { scope: 'PERSONAL' }), /media_assets_owner_chk/);
    await test('PERSONAL with owner accepted', c => ready(c, 'a', { scope: 'PERSONAL', owner: 'owner' }));
    await test('UNCLASSIFIED must be legacy', c => pending(c, 'a', { scope: 'UNCLASSIFIED', layout: 'CANONICAL' }), /media_assets_owner_chk/);
    await test('legacy one-time classification', async (c) => {
        await ready(c, 'a', { scope: 'UNCLASSIFIED', layout: 'LEGACY' });
        await c.query("UPDATE media_assets SET scope='PERSONAL',owner_user_id='owner' WHERE id='a'");
    });
    await test('second classification rejected', async (c) => {
        await ready(c, 'a', { scope: 'UNCLASSIFIED', layout: 'LEGACY' });
        await c.query("UPDATE media_assets SET scope='SHARED' WHERE id='a'");
        await c.query("UPDATE media_assets SET scope='PERSONAL',owner_user_id='owner' WHERE id='a'");
    }, /one-time legacy/);
    await test('unverified original cannot be READY', async (c) => {
        await pending(c);
        await c.query("UPDATE media_files SET status='READY' WHERE id='fa'");
    }, /media_files_ready_chk/);
    await test('verification requires hash and size', async (c) => {
        await pending(c);
        await c.query("UPDATE media_files SET verified_at=now() WHERE id='fa'");
    }, /media_files_verified_chk/);
    await test('pinned hash immutable', async (c) => {
        await ready(c);
        await c.query("UPDATE media_files SET sha256=repeat('b',64) WHERE id='fa'");
    }, /content is immutable/);
    await test('file asset identity immutable', async (c) => {
        await pending(c, 'a');
        await pending(c, 'b');
        await c.query("UPDATE media_files SET asset_id='b' WHERE id='fa'");
    }, /immutable file identity/);
    await test('file key immutable', async (c) => {
        await pending(c);
        await c.query("UPDATE media_files SET object_key='changed' WHERE id='fa'");
    }, /immutable file identity/);
    await test('one original only', async (c) => {
        await pending(c);
        await c.query("INSERT INTO media_files(id,asset_id,role,bucket,object_key,url_key) VALUES('x','a','ORIGINAL','b','x','x')");
    }, /media_files_original_uidx/);
    await test('original isCurrent rejected', async (c) => {
        await ready(c);
        await c.query("UPDATE media_files SET is_current=true WHERE id='fa'");
    }, /media_files_current_chk/);
    await test('derived PENDING isCurrent rejected', async (c) => {
        await ready(c);
        await upload(c, 'a', 'PLAYBACK');
        await c.query("UPDATE media_files SET is_current=true WHERE id='da'");
    }, /media_files_current_chk/);
    await test('original tombstone retained', async (c) => {
        await ready(c);
        await c.query("DELETE FROM media_files WHERE id='fa'");
    }, /tombstones must be retained/);
    await test('asset tombstone retained', async (c) => {
        await pending(c);
        await c.query("DELETE FROM media_assets WHERE id='a'");
    }, /tombstones must be retained/);
    await test('asset READY cannot revert PENDING', async (c) => {
        await ready(c);
        await c.query("UPDATE media_assets SET storage_status='PENDING' WHERE id='a'");
    }, /invalid asset transition/);
    await test('usage requires exactly one target', async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,coaching_session_id,occurrence_count) VALUES('x','a','c','s',1)");
    }, /check constraint/);
    await test('duplicate content usage rejected', async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('x','a','c',1),('y','a','c',1)");
    }, /media_usages_content_uidx/);
    await test('duplicate coaching usage rejected', async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,coaching_session_id,occurrence_count) VALUES('x','a','s',1),('y','a','s',1)");
    }, /media_usages_coaching_uidx/);
    await test('usage of PENDING rejected', async (c) => {
        await pending(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('x','a','c',1)");
    }, /usage requires READY/);
    await test('existing usage survives trash', async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('x','a','c',1)");
        await trash(c);
        await c.query("UPDATE media_usages SET occurrence_count=2 WHERE id='x'");
    });
    await test('ACTIVE unused asset cannot delete', async (c) => {
        await ready(c);
        await deleting(c);
    }, /not eligible for deletion|deletion job does not match asset/);
    await test('used trashed asset cannot delete', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('x','a','c',1)");
        await deleting(c);
    }, /not eligible for deletion|deletion job does not match asset/);
    await test('hold prevents deletion', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("UPDATE media_assets SET retention_hold='REVIEW' WHERE id='a'");
        await deleting(c);
    }, /not eligible for deletion|deletion job does not match asset/);
    await test('grace period prevents deletion', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("UPDATE media_assets SET trash_expires_at=now()+interval '1 day' WHERE id='a'");
        await deleting(c);
    }, /not eligible for deletion|deletion job does not match asset/);
    await test('unclassified prevents deletion', async (c) => {
        await ready(c, 'a', { scope: 'UNCLASSIFIED', layout: 'LEGACY' });
        await trash(c);
        await deleting(c);
    }, /not eligible for deletion|deletion job does not match asset/);
    await test('restoration clears both times', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL,trash_expires_at=NULL WHERE id='a'");
    });
    await test('restoration with leftover expiry rejected', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL WHERE id='a'");
    }, /media_assets_trash_chk/);
    await test('DELETING cannot restore', async (c) => {
        await ready(c);
        await trash(c);
        await deleting(c);
        await c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL,trash_expires_at=NULL WHERE id='a'");
    }, /media_assets_state_chk/);
    await test('deletion must retire files in same transaction', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("UPDATE media_assets SET storage_status='DELETING' WHERE id='a'");
    }, /asset\/file state mismatch/);
    await test('retired file retains cleanup schedule', async (c) => {
        await pending(c);
        await c.query("UPDATE media_files SET status='RETIRED' WHERE id='fa'");
    }, /media_files_cleanup_chk/);
    await test('partial physical deletion allowed while parent DELETING', async (c) => {
        await ready(c);
        await trash(c);
        await deleting(c);
        await deletedFiles(c);
    });
    await test('full delete and subsequent sweep allowed', async (c) => {
        await ready(c);
        await trash(c);
        await deleting(c);
        await deletedFiles(c);
        await finishDeleted(c);
        await c.query("UPDATE media_files SET last_absence_observed_at=now(),next_sweep_at=now()+interval '1 day' WHERE id='fa'");
    });
    await test('asset DELETED requires all files gone', async (c) => {
        await ready(c);
        await trash(c);
        await deleting(c);
        await finishDeleted(c);
    }, /asset\/file state mismatch/);
    await test('never-started upload abandons without writer acknowledgement', async (c) => {
        await pending(c);
        let { u } = await upload(c);
        await abandon(c, u);
        await c.query("UPDATE media_assets SET storage_status='ABANDONED' WHERE id='a'");
        await retire(c);
        await deletedFiles(c);
    });
    await test('abandoned asset cannot retain active prep', async (c) => {
        await pending(c);
        await upload(c);
        await c.query("UPDATE media_assets SET storage_status='ABANDONED' WHERE id='a'");
        await retire(c);
    }, /active preparation/);
    await test('upload cannot jump to COMPLETED', async (c) => {
        await pending(c);
        let { u } = await upload(c);
        await c.query("UPDATE media_uploads SET phase='COMPLETED' WHERE id=$1", [u]);
    }, /invalid preparation transition/);
    await test('one preparation per file', async (c) => {
        await pending(c);
        await upload(c);
        await c.query("INSERT INTO media_uploads(id,file_id,source_kind,staging_object_key,expected_mime_type,expected_byte_size,upload_expires_at,deadline_at) VALUES('other','fa','CLIENT','other','audio/mpeg',100,now(),now()+interval '1 day')");
    }, /file_id_key/);
    await test('promotion requires verification', async (c) => {
        await pending(c);
        let { u } = await upload(c);
        await validating(c, u);
        await c.query("UPDATE media_uploads SET phase='PROMOTING',source_etag='x',validated_at=now() WHERE id=$1", [u]);
    }, /pinned verification/);
    await test('normal preparation full commit', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await complete(c, u, f, 'a');
    });
    await test('validation fingerprint cannot change on retry', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await c.query("UPDATE media_uploads SET source_etag='other' WHERE id=$1", [u]);
    }, /validated source is immutable/);
    await test('wrong worker token updates no result', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        let r = await c.query("UPDATE media_uploads SET phase='COMPLETED',completed_at=now(),staging_cleanup_due_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id=$1 AND lease_token='stale-token'", [u]);
        assert.equal(r.rowCount, 0);
    });
    await test('ABANDONED preparation cannot revive', async (c) => {
        await pending(c);
        let { u } = await upload(c);
        await abandon(c, u);
        await c.query("UPDATE media_uploads SET phase='VALIDATING' WHERE id=$1", [u]);
    }, /invalid preparation transition/);
    await test('completed preparation cannot lose staging sweep', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await complete(c, u, f, 'a');
        await c.query("UPDATE media_uploads SET staging_cleanup_due_at=NULL WHERE id=$1", [u]);
    }, /check constraint/);
    await test('completed preparation sweep still works after asset delete', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await complete(c, u, f, 'a');
        await trash(c);
        await deleting(c);
        await deletedFiles(c);
        await finishDeleted(c);
        await c.query("UPDATE media_uploads SET staging_last_absent_at=now(),staging_cleanup_due_at=now()+interval '1 day' WHERE id=$1", [u]);
    });
    await test('abandoned derivative does not retire original', async (c) => {
        await ready(c);
        let { u, f } = await upload(c, 'a', 'PLAYBACK');
        await abandon(c, u);
        await c.query("UPDATE media_files SET status='RETIRED',cleanup_requested_at=now(),next_sweep_at=now() WHERE id=$1", [f]);
    });
    await test('delete cancels in-progress derivative without STOPPED', async (c) => {
        await ready(c);
        let { u } = await upload(c, 'a', 'PLAYBACK');
        await validating(c, u);
        await trash(c);
        await abandon(c, u);
        await deleting(c);
        await deletedFiles(c);
        await finishDeleted(c);
    });
    await test('job RUNNING requires claimed asset', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await c.query("UPDATE media_deletion_jobs SET status='RUNNING',lease_token='t',lease_expires_at=now()+interval '1 minute' WHERE id='j'");
    }, /does not match asset/);
    await test('deletion job retries and succeeds', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await deleting(c);
        await c.query("UPDATE media_deletion_jobs SET status='RUNNING',lease_token='t',lease_expires_at=now()+interval '1 minute' WHERE id='j'");
        await c.query("UPDATE media_deletion_jobs SET status='RETRY',lease_token=NULL,lease_expires_at=NULL WHERE id='j'");
        await c.query("UPDATE media_deletion_jobs SET status='RUNNING',lease_token='t2',lease_expires_at=now()+interval '1 minute' WHERE id='j'");
        await deletedFiles(c);
        await finishDeleted(c);
        await c.query("UPDATE media_deletion_jobs SET status='SUCCEEDED',completed_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id='j'");
    });
    await test('canonical file requires preparation at commit', c => pending(c, 'a', { layout: 'CANONICAL' }), /file\/preparation state mismatch/);
    await test('canonical full preparation completes', async (c) => {
        await pending(c, 'a', { layout: 'CANONICAL' });
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await complete(c, u, f, 'a');
    });
    await test('abandoning prep alone rejected at commit', async (c) => {
        await pending(c);
        let { u } = await upload(c);
        await abandon(c, u);
    }, /file\/preparation state mismatch/);
    await test('abandoned derivative cannot publish', async (c) => {
        await ready(c);
        let { u, f } = await upload(c, 'a', 'PLAYBACK');
        await promoting(c, u, f);
        await abandon(c, u);
        await c.query("UPDATE media_files SET status='READY',is_current=true WHERE id=$1", [f]);
    }, /file\/preparation state mismatch/);
    await test('completion cannot leave pending file', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await c.query("UPDATE media_uploads SET phase='COMPLETED',completed_at=now(),staging_cleanup_due_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id=$1", [u]);
    }, /file\/preparation state mismatch/);
    await test('READY original cannot retain promoting prep', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await c.query("UPDATE media_files SET status='READY' WHERE id=$1", [f]);
        await c.query("UPDATE media_assets SET storage_status='READY' WHERE id='a'");
    }, /file\/preparation state mismatch/);
    await test('deletion state cannot lose job', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("UPDATE media_assets SET storage_status='DELETING' WHERE id='a'");
        await retire(c);
    }, /asset\/deletion job state mismatch/);
    await test('restore must cancel scheduled job', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL,trash_expires_at=NULL WHERE id='a'");
    }, /asset\/deletion job state mismatch/);
    await test('restore and job cancellation commit together', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL,trash_expires_at=NULL WHERE id='a'");
        await c.query("UPDATE media_deletion_jobs SET status='CANCELLED' WHERE id='j'");
    });
    await test('hold must cancel scheduled job', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await c.query("UPDATE media_assets SET retention_hold='REVIEW' WHERE id='a'");
    }, /asset\/deletion job state mismatch/);
    await test('original delete completes before derived delete', async (c) => {
        await ready(c);
        let { u } = await upload(c, 'a', 'PLAYBACK');
        await abandon(c, u);
        await trash(c);
        await deleting(c);
        await c.query("UPDATE media_files SET status='DELETED',last_absence_observed_at=now() WHERE id='fa'");
    });
    await test('expired lease cannot complete', async (c) => {
        await pending(c);
        let { u, f } = await upload(c);
        await promoting(c, u, f);
        await c.query("UPDATE media_uploads SET lease_expires_at=now()-interval '1 second' WHERE id=$1", [u]);
        const r = await c.query("UPDATE media_uploads SET phase='COMPLETED',completed_at=now(),staging_cleanup_due_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id=$1 AND lease_token='token1' AND lease_expires_at>clock_timestamp()", [u]);
        assert.equal(r.rowCount, 0);
    });
    await test('content hard delete cannot bypass usage', async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('x','a','c',1)");
        await c.query("DELETE FROM contents WHERE id='c'");
    }, /foreign key constraint/);
    await test('personal owner hard delete blocked', async (c) => {
        await ready(c, 'a', { scope: 'PERSONAL', owner: 'owner' });
        await c.query("DELETE FROM users WHERE id='owner'");
    }, /foreign key constraint/);
    await test('two current playback versions rejected', async (c) => {
        await ready(c);
        for (const suffix of ['old', 'new']) {
            let { u, f } = await upload(c, 'a', 'PLAYBACK', suffix);
            await promoting(c, u, f);
            await complete(c, u, f, 'a');
            await c.query("UPDATE media_files SET is_current=true WHERE id=$1", [f]);
        }
    }, /media_files_current_uidx/);
    await test('derived playback selection changes atomically', async (c) => {
        await ready(c);
        let old = await upload(c, 'a', 'PLAYBACK', 'old');
        await promoting(c, old.u, old.f);
        await complete(c, old.u, old.f, 'a');
        await c.query("UPDATE media_files SET is_current=true WHERE id=$1", [old.f]);
        let next = await upload(c, 'a', 'PLAYBACK', 'new');
        await promoting(c, next.u, next.f);
        await complete(c, next.u, next.f, 'a');
        await c.query("UPDATE media_files SET is_current=false WHERE id=$1", [old.f]);
        await c.query("UPDATE media_files SET is_current=true WHERE id=$1", [next.f]);
    });
    await test('DELETED file cannot republish after late write', async (c) => {
        await ready(c);
        await trash(c);
        await deleting(c);
        await deletedFiles(c);
        await finishDeleted(c);
        await c.query("UPDATE media_files SET status='READY',cleanup_requested_at=NULL,next_sweep_at=NULL WHERE id='fa'");
    }, /invalid file transition/);
    await test('DELETED asset cannot return READY', async (c) => {
        await ready(c);
        await trash(c);
        await deleting(c);
        await deletedFiles(c);
        await finishDeleted(c);
        await c.query("UPDATE media_assets SET storage_status='READY' WHERE id='a'");
    }, /invalid asset transition/);
    await test('registered usage requires scheduled job cancellation', async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('u','a','c',1)");
    }, /asset\/deletion job state mismatch/);
    await test("course cascade cannot remove a referenced content", async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('u','a','c',1)");
        await c.query("DELETE FROM courses WHERE id='00000000-0000-4000-8000-000000000001'");
    }, /media_usages_content_id_fkey/);
    await test("coaching entitlement cascade cannot remove a referenced session", async (c) => {
        await ready(c);
        await c.query("INSERT INTO media_usages(id,asset_id,coaching_session_id,occurrence_count) VALUES('u','a','s',1)");
        await c.query("DELETE FROM coaching_entitlements WHERE id='entitlement'");
    }, /media_usages_coaching_session_id_fkey/);
    await test("explicit usage removal allows content deletion and schedules trash", async (c) => {
        await ready(c);
        await trash(c);
        await c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('u','a','c',1)");
        await c.query("DELETE FROM media_usages WHERE id='u'");
        await c.query("INSERT INTO media_deletion_jobs(id,asset_id,next_attempt_at) VALUES('j','a',now())");
        await c.query("DELETE FROM contents WHERE id='c'");
    });
    // These races commit fixtures, so run them after rollback-only cases.
    const fixture = n => async (c) => {
        await ready(c, n);
        await trash(c, n);
    };
    await race('concurrency: delete claims before new usage', fixture('r1'), c => deleting(c, 'r1'), c => c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('r1use','r1','c',1)"), /usage requires READY/);
    await race('concurrency: usage commits before delete', fixture('r2'), c => c.query("INSERT INTO media_usages(id,asset_id,content_id,occurrence_count) VALUES('r2use','r2','c',1)"), c => deleting(c, 'r2'), /not eligible for deletion|deletion job does not match asset/);
    await race('concurrency: restoration wins before deletion', fixture('r3'), c => c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL,trash_expires_at=NULL WHERE id='r3'"), c => deleting(c, 'r3'), /not eligible for deletion|deletion job does not match asset/);
    await race('concurrency: deletion wins before restoration', fixture('r4'), c => deleting(c, 'r4'), c => c.query("UPDATE media_assets SET library_status='ACTIVE',trashed_at=NULL,trash_expires_at=NULL WHERE id='r4'"), /media_assets_state_chk/);
    await clientChecks();
    // Set this before importing application services (their singleton loads dotenv).
    // dotenv does not override these explicit test-only values.
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(config.user)}@localhost:${config.port}/postgres?host=${encodeURIComponent(root)}`;
    process.env.MEDIA_LIBRARY_ROLLOUT = "all";
    process.env.MEDIA_LIBRARY_UPLOADS = "enabled";
    delete process.env.MEDIA_R2_PRODUCTION_TARGET;
    process.env.APP_URL = "https://app.example.invalid";
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.invalid/files";
    process.env.R2_BUCKET = "library-test";
    process.env.R2_ENDPOINT = "https://fixture.r2.cloudflarestorage.com";
    process.env.R2_ACCESS_KEY_ID = "fixture-key";
    process.env.R2_SECRET_ACCESS_KEY = "fixture-secret";
    process.env.R2_LEGACY_KEY_PREFIX = "";
    // Match the runtime primitive Next installs before loading request stores.
    globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
    const applicationDb = new PrismaClient({ adapter: new PrismaPg(postgresUtcConfig(config)) });
    try {
        const { runR2CompatibilityIntegration } = await import("./media-r2-compat.integration.ts");
        await runR2CompatibilityIntegration(check);
        const { runMediaBackfillPlanIntegration } = await import("./media-backfill-plan.integration.ts");
        await runMediaBackfillPlanIntegration(check);
        const { runMediaRolloutIntegration } = await import("./media-rollout.integration.ts");
        await runMediaRolloutIntegration(check);
        const { runMediaEditorIntegration } = await import("./media-editor.integration.ts");
        await runMediaEditorIntegration(check);
        const { runMediaUsageIntegration } = await import("./media-usage.integration.ts");
        await runMediaUsageIntegration(applicationDb, check);
        const { runMediaUploadIntegration } = await import("./media-upload.integration.ts");
        await runMediaUploadIntegration(applicationDb, check);
        const { runMediaContentIntegration } = await import("./media-content.integration.ts");
        await runMediaContentIntegration(check);
        const { runMediaLibraryIntegration } = await import("./media-library.integration.ts");
        await runMediaLibraryIntegration(applicationDb, check);
        const { runMediaLifecycleIntegration } = await import("./media-lifecycle.integration.ts");
        await runMediaLifecycleIntegration(applicationDb, check);
        const { runMediaCleanupIntegration } = await import("./media-cleanup.integration.ts");
        await runMediaCleanupIntegration(applicationDb, check);
        const { runMediaRouteIntegration } = await import("./media-routes.integration.ts");
        await runMediaRouteIntegration(applicationDb, check);
        const auditClient = await client();
        try {
          const { runMediaAuditIntegration } = await import("./media-audit.integration.ts");
          await runMediaAuditIntegration(auditClient, check, client);
        } finally {
            await auditClient.end();
        }
        const { runMediaBackfillIntegration } = await import("./media-backfill.integration.ts");
        await runMediaBackfillIntegration(applicationDb, check);
    } finally {
        await applicationDb.$disconnect();
        await globalThis.prisma?.$disconnect();
        await globalThis.pgPool?.end();
    }
    const report = { postgres: version, tests: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok) };
    fs.writeFileSync(path.join(root, "results.json"), JSON.stringify({ ...report, cases: results }, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (report.failed.length) {
        process.exitCode = 1;
        console.error(`Failure details retained in ${root}`);
    }
}
try {
    await main();
}
catch (error) {
    console.error(error.stack);
    if (error.stderr)
        console.error(String(error.stderr));
    process.exitCode = 1;
    console.error(`Failure details retained in ${root}`);
}
finally {
    // Do not delete the cluster directory unless the server is confirmed stopped.
    let stopped = !started;
    if (started) {
        try {
            run(pgBinary("pg_ctl"), ["-D", data, "stop", "-m", "fast", "-w", "-t", "10"]);
            stopped = true;
        }
        catch (error) {
            console.error(`Could not stop test PostgreSQL: ${error.message}`);
            process.exitCode = 1;
        }
    }
    if (stopped && !process.exitCode)
        fs.rmSync(root, { recursive: true, force: true });
}
