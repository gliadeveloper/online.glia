// Local Docker only. Synthetic data, isolated network, no application .env files.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [runnerTag, migratorTag, output] = process.argv.slice(2);
if (!runnerTag || !migratorTag || !output) throw new Error("Usage: node scripts/media-image-smoke.mjs <runner-image> <migrator-image> <new-result.json>");
const docker = (args, input) => execFileSync("docker", args, { encoding: "utf8", input, timeout: 120000, maxBuffer: 4 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] }).trim();
const context = docker(["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"]);
assert(context.startsWith("unix://") && !process.env.DOCKER_HOST, "Local Unix-socket Docker context required");
const image = tag => JSON.parse(docker(["image", "inspect", tag]))[0];
const runner = image(runnerTag), migrator = image(migratorTag);
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
assert.equal(runner.Architecture, "amd64"); assert.equal(migrator.Architecture, "amd64");
assert.equal(runner.Config.User, "nextjs");
assert(!runner.Config.Env.some(value => /^(R2_|MEDIA_R2_PRODUCTION_TARGET=)/.test(value)), "Image must not embed R2 configuration");
const suffix = randomBytes(5).toString("hex"), network = `glia-media-smoke-${suffix}`;
const database = `${network}-db`, app = `${network}-app`;
const password = randomBytes(24).toString("hex");
const databaseUrl = `postgresql://media_smoke:${password}@${database}:5432/media_smoke?schema=public`;
const tokens = Object.fromEntries(["ADMIN", "COACH", "USER"].map(role => [role, randomBytes(32).toString("hex")]));
const results = [];
let runtimePackages;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const sql = query => docker(["exec", "-i", database, "psql", "-U", "media_smoke", "-d", "media_smoke", "-v", "ON_ERROR_STOP=1", "-At"], query);
async function check(name, fn) { await fn(); results.push(name); console.log(`PASS ${name}`); }
function removeApp() { try { docker(["rm", "-f", app]); } catch {} }
// An internal Docker network may not publish host ports. Make real HTTP requests
// inside the app container, retaining the fixture's no-egress boundary.
function http(path, options = {}) {
  const result = JSON.parse(docker(["exec", app, "node", "-e", `
    const [path, options] = JSON.parse(process.argv[1]);
    fetch("http://127.0.0.1:3000" + path, { ...options, signal: AbortSignal.timeout(20000) })
      .then(async response => console.log(JSON.stringify({ status: response.status, headers: [...response.headers], body: await response.text() })))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  `, JSON.stringify([path, options])]));
  return new Response(result.body, { status: result.status, headers: result.headers });
}
async function startApp(mode, uploads = "disabled") {
  removeApp();
  docker(["run", "-d", "--platform", "linux/amd64", "--name", app, "--network", network,
    "--memory", "1536m", "--memory-swap", "1536m", "--cpus", "2", "--pids-limit", "128",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--env", `DATABASE_URL=${databaseUrl}`, "--env", `MEDIA_LIBRARY_ROLLOUT=${mode}`,
    "--env", `MEDIA_LIBRARY_UPLOADS=${uploads}`, "--env", "SESSION_SECRET=synthetic-image-smoke-only", runner.Id]);
  for (let n = 0; n < 60; n++) {
    try { if (http("/login").ok) return; } catch {}
    await pause(1000);
  }
  throw new Error("App did not become ready");
}
async function request(path, expected, role, method = "GET") {
  const response = http(path, { method, headers: { "content-type": "application/json", "x-user-id": "smoke-admin", ...(role ? { cookie: `glia_session=${tokens[role]}` } : {}) },
    ...(method === "GET" ? {} : { body: "{}" }) });
  assert.equal(response.status, expected, `${method} ${path}`);
  return response;
}
let failure;
try {
  docker(["network", "create", "--internal", network]);
  docker(["run", "-d", "--name", database, "--network", network, "--env", "POSTGRES_USER=media_smoke", "--env", "POSTGRES_DB=media_smoke", "--env", `POSTGRES_PASSWORD=${password}`, "postgres:16.15-alpine"]);
  for (let n = 0; ; n++) { try { sql("SELECT 1"); break; } catch { if (n > 30) throw new Error("Fixture DB not ready"); await pause(1000); } }
  await check("migrator applies 17 migrations to a fresh synthetic PostgreSQL 16 database and can repeat", async () => {
    for (let n = 0; n < 2; n++) docker(["run", "--rm", "--name", `${network}-migrator`, "--platform", "linux/amd64", "--network", network, "--env", `DATABASE_URL=${databaseUrl}`, migrator.Id]);
    assert.equal(sql('SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'), "17");
    assert.equal(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'media_%'"), "5");
  });
  for (const [role, token] of Object.entries(tokens)) {
    const id = `smoke-${role.toLowerCase()}`, hash = createHash("sha256").update(token).digest("hex");
    sql(`INSERT INTO users(id,email,role,"updatedAt") VALUES('${id}','${id}@example.invalid','${role}',now());
      INSERT INTO auth_sessions(id,"userId","tokenHash","expiresAt") VALUES('${id}','${id}','${hash}',now()+interval '1 hour');`);
  }
  for (const mode of ["off", "admin", "all"]) {
    await startApp(mode);
    if (mode === "off") await check("protected-page login redirects and legacy URLs work in the production bundle", async () => {
      for (const path of ["/admin", "/coach", "/learning", "/coaching", "/mypage"]) {
        const response = http(path, { redirect: "manual" });
        assert.equal(response.status, 307, path);
        const location = new URL(response.headers.get("location"));
        assert.equal(location.pathname, "/login");
        assert.equal(location.searchParams.get("next"), path);
      }
      for (const [path, destination] of [["/lms/fixture?probe=1", "/learning/fixture"], ["/dashboard?probe=1", "/"]]) {
        const response = http(path, { redirect: "manual" });
        assert.equal(response.status, 307);
        const location = new URL(response.headers.get("location"));
        assert.equal(location.pathname, destination);
        assert.equal(location.searchParams.get("probe"), "1");
      }
    });
    await check(`${mode}: real image authenticates sessions and enforces role rollout; new uploads remain paused`, async () => {
      await request("/api/admin/media/library/capabilities", 401);
      await request("/api/admin/media/library/capabilities", 403, "COACH");
      await request("/api/coach/media/library/capabilities", 403, "USER");
      for (const role of ["ADMIN", "COACH"]) {
        const route = `/api/${role.toLowerCase()}/media/library`;
        const enabled = mode === "all" || (mode === "admin" && role === "ADMIN");
        const response = await request(route + "/capabilities", 200, role);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.deepEqual(await response.json(), { libraryEnabled: enabled, uploadEnabled: false });
        await request(route, enabled ? 200 : 503, role);
        for (const path of [route + "/uploads", route + "/uploads/missing/complete"]) {
          const rejected = await request(path, 503, role, "POST");
          assert.equal((await rejected.json()).code, enabled ? "MEDIA_UPLOADS_DISABLED" : "MEDIA_LIBRARY_DISABLED");
        }
      }
      assert.equal(sql("SELECT (SELECT count(*) FROM media_assets) + (SELECT count(*) FROM media_uploads)"), "0");
    });
  }
  await check("non-root amd64 image runs ffprobe/ffmpeg and decodes synthetic image, video and audio within a 1.5GiB container", async () => {
    assert.equal(docker(["exec", app, "id", "-u"]), "1001");
    assert.equal(docker(["exec", app, "node", "-e", 'console.log(require("node:fs").readdirSync("/app").some(name => name === ".env" || name.startsWith(".env.")))']), "false");
    for (const [name, args] of [
      ["image.png", ["-f", "lavfi", "-i", "color=c=blue:s=64x64", "-frames:v", "1"]],
      ["video.mp4", ["-f", "lavfi", "-i", "color=c=blue:s=64x64:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p"]],
      ["audio.mp3", ["-f", "lavfi", "-i", "sine=frequency=440:duration=1"]],
    ]) {
      const path = `/tmp/${name}`;
      docker(["exec", app, "ffmpeg", "-v", "error", "-nostdin", ...args, "-threads", "1", path]);
      const info = JSON.parse(docker(["exec", app, "ffprobe", "-v", "error", "-show_streams", "-of", "json", path]));
      assert(info.streams.length > 0);
      docker(["exec", app, "ffmpeg", "-v", "error", "-nostdin", "-xerror", "-err_detect", "explode", "-max_alloc", "268435456", "-threads", "1", "-protocol_whitelist", "file", "-i", path, "-map", "0:v?", "-map", "0:a?", "-threads", "1", "-f", "null", "-"]);
    }
    assert.equal(JSON.parse(docker(["inspect", app]))[0].State.OOMKilled, false);
  });
  await check("runtime packages match the tested lock and Prisma CLI dependencies are absent from the service image", async () => {
    runtimePackages = JSON.parse(docker(["exec", app, "node", "-e", `
      const fs = require("node:fs"), path = require("node:path"), packages = {};
      function visit(root) {
        if (!fs.existsSync(root)) return;
        for (const name of fs.readdirSync(root)) {
          if (name.startsWith(".")) continue;
          const dir = path.join(root, name);
          if (name.startsWith("@")) { visit(dir); continue; }
          const manifest = path.join(dir, "package.json");
          if (fs.existsSync(manifest)) {
            const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
            (packages[pkg.name] ??= []).push(pkg.version);
          }
          visit(path.join(dir, "node_modules"));
        }
      }
      visit("/app/node_modules");
      console.log(JSON.stringify(packages));
    `]));
    for (const name of ["next", "sharp", "@tiptap/core", "@tiptap/pm", "prosemirror-view"]) {
      assert.deepEqual([...new Set(runtimePackages[name])], [lock.packages[`node_modules/${name}`].version], name);
    }
    for (const name of ["prisma", "@prisma/config", "@prisma/dev", "deepmerge-ts", "find-my-way", "mysql2", "valibot"]) {
      assert.equal(runtimePackages[name], undefined, `${name} belongs to tooling, not the public service`);
    }
  });
} catch (error) { failure = error instanceof Error ? error.message : String(error); }
finally {
  removeApp();
  try { docker(["rm", "-f", `${network}-migrator`]); } catch {}
  // Only unique resources created by this run; never a pre-existing app or volume.
  try { docker(["rm", "-fv", database]); } catch {}
  try { docker(["network", "rm", network]); } catch {}
}
writeFileSync(output, JSON.stringify({ date: new Date().toISOString(), runner: runner.Id, migrator: migrator.Id, platform: "linux/amd64", tests: results, runtimePackages, failure: failure ?? null,
  limits: "Synthetic short media only; not production browser playback, R2 upload or capacity certification." }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
if (failure) { console.error(failure); process.exitCode = 1; }
