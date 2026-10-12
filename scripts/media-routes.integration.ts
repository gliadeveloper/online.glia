import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createRequestStoreForAPI } from "next/dist/server/async-storage/request-store";
import { workAsyncStorage, type WorkStore } from "next/dist/server/app-render/work-async-storage.external";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import type { PrismaClient } from "../src/generated/prisma/client";
import { hashSessionToken } from "../src/lib/auth-session";
import { mediaBodyVersion } from "../src/lib/media/body-version";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
type Handler = (request: Request, context: { params: Promise<{ id: string; moduleId: string }> }) => Promise<Response>;

// Next 16.3 request-store adapter: execute the real route and cookie reader,
// with only the HTTP request context supplied by this isolated test harness.
async function call(handler: Handler, method: string, body: unknown = {}, cookie?: string, id = "missing", requestUrl = "https://app.example.invalid/api/test?userId=media-admin") {
  const request = new NextRequest(requestUrl, {
    method,
    headers: { ...(body instanceof FormData ? {} : { "content-type": "application/json" }), "x-user-id": "media-admin", ...(cookie ? { cookie: `glia_session=${cookie}` } : {}) },
    ...(method === "GET" || method === "DELETE" ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
  const store = createRequestStoreForAPI(request, request.nextUrl, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined);
  const work = { route: "/api/test", isStaticGeneration: false } as WorkStore;
  return workAsyncStorage.run(work, () => workUnitAsyncStorage.run(store, () => handler(request, { params: Promise.resolve({ id, moduleId: id }) })));
}

export async function runMediaRouteIntegration(db: PrismaClient, check: Check) {
  const endpoints: Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", Handler>>[] = [
    await import("../src/app/api/admin/contents/[id]/route"),
    await import("../src/app/api/coach/contents/[id]/route"),
    await import("../src/app/api/admin/lessons/[id]/contents/route"),
    await import("../src/app/api/coach/lessons/[id]/contents/route"),
    await import("../src/app/api/admin/lessons/[id]/route"),
    await import("../src/app/api/coach/lessons/[id]/route"),
    await import("../src/app/api/admin/courses/[id]/modules/[moduleId]/route"),
    await import("../src/app/api/coach/courses/[id]/modules/[moduleId]/route"),
    await import("../src/app/api/admin/coaching/sessions/[id]/route"),
    await import("../src/app/api/coach/sessions/[id]/route"),
    await import("../src/app/api/coach/media/library/uploads/route"),
    await import("../src/app/api/coach/media/library/uploads/[id]/complete/route"),
    await import("../src/app/api/admin/media/library/uploads/route"),
    await import("../src/app/api/admin/media/library/uploads/[id]/complete/route"),
    await import("../src/app/api/coach/media/library/route"),
    await import("../src/app/api/admin/media/library/route"),
    await import("../src/app/api/coach/media/library/[id]/route"),
    await import("../src/app/api/admin/media/library/[id]/route"),
    await import("../src/app/api/admin/media/library/capabilities/route"),
    await import("../src/app/api/coach/media/library/capabilities/route"),
    await import("../src/app/api/admin/media/upload-image/route"),
    await import("../src/app/api/admin/media/upload-coaching-image/route"),
    await import("../src/app/api/admin/media/presign-image/route"),
    await import("../src/app/api/coach/media/upload-image/route"),
    await import("../src/app/api/coach/media/upload-coaching-image/route"),
    await import("../src/app/api/coach/media/presign-image/route"),

  ];
  await check("media routes: all handlers reject spoofed user IDs without a session", async () => {
    for (const endpoint of endpoints) {
      for (const [method, handler] of Object.entries(endpoint)) {
        if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) continue;
        const response = await call(handler as Handler, method, { userId: "media-admin", type: "HTML", body: "spoof" });
        assert.equal(response.status, 401, `${method} must require a verified session`);
        assert.equal((await response.json()).code, "UNAUTHORIZED");
      }
    }
  });
  const token = "b".repeat(64);
  const auth = await db.authSession.create({ data: { userId: "teacher", tokenHash: await hashSessionToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  const parent = await db.module.create({ data: { courseId: "00000000-0000-4000-8000-000000000001", title: "Route fixture" } });
  const lesson = await db.lesson.create({ data: { moduleId: parent.id, title: "Route fixture" } });
  const content = await db.content.create({ data: { lessonId: lesson.id, type: "HTML", body: "Initial" } });
  const endpoint = endpoints[1] as { PATCH: Handler };
  await check("legacy upload routes: a coach cannot write under a different course using an owned lesson", async () => {
    const payload = { courseId: "wrong-course", lessonId: lesson.id, fileName: "test.png", contentType: "image/png" };
    const presign = await import("../src/app/api/coach/media/presign-image/route");
    assert.equal((await call(presign.POST, "POST", payload, token)).status, 404);
    const form = new FormData();
    form.set("courseId", payload.courseId); form.set("lessonId", lesson.id);
    form.set("file", new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXx8AAAAASUVORK5CYII=", "base64")], "test.png", { type: "image/png" }));
    const upload = await import("../src/app/api/coach/media/upload-image/route");
    const response = await call(upload.POST, "POST", form, token);
    assert.equal(response.status, 404); assert.equal((await response.json()).code, "LESSON_NOT_FOUND");
  });
  await check("rollout routes: disabled listing, mutation, reservation and completion cannot touch storage or rows", async () => {
    const before = { assets: await db.mediaAsset.count(), uploads: await db.mediaUpload.count() };
    const old = process.env.MEDIA_LIBRARY_ROLLOUT;
    try {
      process.env.MEDIA_LIBRARY_ROLLOUT = "off";
      for (const index of [10, 11, 14, 16]) {
        for (const [method, handler] of Object.entries(endpoints[index])) {
          if (!["GET", "POST", "PATCH"].includes(method)) continue;
          const response = await call(handler as Handler, method, {}, token);
          assert.equal(response.status, 503);
          assert.equal((await response.json()).code, "MEDIA_LIBRARY_DISABLED");
        }
      }
      const response = await call(endpoints[19].GET as Handler, "GET", {}, token);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("vary"), "Cookie");
      assert.deepEqual(await response.json(), { libraryEnabled: false, uploadEnabled: false });
      assert.deepEqual({ assets: await db.mediaAsset.count(), uploads: await db.mediaUpload.count() }, before);
    } finally { process.env.MEDIA_LIBRARY_ROLLOUT = old; }
  });
  await check("rollout routes: admin-only mode uses verified roles; upload pause leaves listing available", async () => {
    const adminToken = "e".repeat(64);
    const adminAuth = await db.authSession.create({ data: { userId: "media-admin", tokenHash: await hashSessionToken(adminToken), expiresAt: new Date(Date.now() + 3600000) } });
    const old = { mode: process.env.MEDIA_LIBRARY_ROLLOUT, uploads: process.env.MEDIA_LIBRARY_UPLOADS };
    try {
      process.env.MEDIA_LIBRARY_ROLLOUT = "admin";
      assert.equal((await call(endpoints[14].GET as Handler, "GET", {}, token)).status, 503);
      assert.equal((await call(endpoints[15].GET as Handler, "GET", {}, token)).status, 403);
      assert.equal((await call(endpoints[15].GET as Handler, "GET", {}, adminToken)).status, 200);
      process.env.MEDIA_LIBRARY_UPLOADS = "disabled";
      assert.deepEqual(await (await call(endpoints[18].GET as Handler, "GET", {}, adminToken)).json(), { libraryEnabled: true, uploadEnabled: false });
      for (const index of [12, 13]) {
        const response = await call(endpoints[index].POST as Handler, "POST", {}, adminToken);
        assert.equal(response.status, 503); assert.equal((await response.json()).code, "MEDIA_UPLOADS_DISABLED");
      }
      assert.equal((await call(endpoints[15].GET as Handler, "GET", {}, adminToken)).status, 200);
    } finally {
      process.env.MEDIA_LIBRARY_ROLLOUT = old.mode; process.env.MEDIA_LIBRARY_UPLOADS = old.uploads;
      await db.authSession.delete({ where: { id: adminAuth.id } });
    }
  });
  await check("media library route: session identity governs listing and admin boundary", async () => {
    const coach = await import("../src/app/api/coach/media/library/route");
    const admin = await import("../src/app/api/admin/media/library/route");
    const response = await call(coach.GET, "GET", {}, token);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert(Array.isArray((await response.json()).items));
    assert.equal((await call(admin.GET, "GET", {}, token)).status, 403);
  });
  await check("media library mutation route: session owner, version guards and private responses", async () => {
    const coach = await import("../src/app/api/coach/media/library/[id]/route");
    const admin = await import("../src/app/api/admin/media/library/[id]/route");
    const a = await db.mediaAsset.findFirstOrThrow({ where: { scope: "PERSONAL", ownerUserId: "teacher", storageStatus: "READY", libraryStatus: "ACTIVE" } });
    const body = { libraryStatus: "TRASHED", expectedVersion: a.updatedAt.toISOString(), userId: "media-admin" };
    assert.equal((await call(admin.PATCH, "PATCH", body, token, a.id)).status, 403);
    assert.equal((await call(coach.PATCH, "PATCH", { libraryStatus: "TRASHED" }, token, a.id)).status, 428);
    const result = await call(coach.PATCH, "PATCH", body, token, a.id);
    assert.equal(result.status, 200); assert.equal(result.headers.get("cache-control"), "private, no-store"); assert.equal(result.headers.get("vary"), "Cookie");
    const data = await result.json();
    const stale = await call(coach.PATCH, "PATCH", { ...body, libraryStatus: "ACTIVE" }, token, a.id);
    assert.equal(stale.status, 409); assert.equal(stale.headers.get("cache-control"), "private, no-store");
    const restored = await call(coach.PATCH, "PATCH", { libraryStatus: "ACTIVE", expectedVersion: data.version }, token, a.id);
    assert.equal(restored.status, 200);
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: a.id, action: "MEDIA_ASSET_RESTORED" } });
    assert.equal(audit.actorId, "teacher");
  });
  await check("media trash list route: coach cannot list shared trash", async () => {
    const coach = await import("../src/app/api/coach/media/library/route");
    const result = await call(coach.GET, "GET", {}, token, "missing", "https://app.example.invalid/api/coach/media/library?scope=SHARED&status=TRASHED");
    assert.equal(result.status, 403); assert.equal(result.headers.get("cache-control"), "private, no-store");
  });
  await check("media GET route: spoofed header cannot replace session on registered legacy URL", async () => {
    const { GET } = await import("../src/app/api/media/r2/route");
    const file = await db.mediaFile.findFirstOrThrow({ where: { asset: { scope: "PERSONAL", ownerUserId: "owner" }, status: "READY" } });
    const requestUrl = `https://app.example.invalid/api/media/r2?key=${encodeURIComponent(file.urlKey)}&userId=owner`;
    assert.equal((await call(GET, "GET", {}, undefined, "missing", requestUrl)).status, 401);
    // A valid teacher cookie still cannot use another owner's unused personal asset.
    const unused = await db.mediaFile.findFirstOrThrow({ where: { asset: { scope: "PERSONAL", ownerUserId: "owner", usages: { none: {} } }, status: "READY" } });
    const forbiddenUrl = `https://app.example.invalid/api/media/r2?key=${encodeURIComponent(unused.urlKey)}`;
    assert.equal((await call(GET, "GET", {}, token, "missing", forbiddenUrl)).status, 404);
  });
  await check("media route: verified coach saves, version errors map to 428/409", async () => {
    const missing = await call(endpoint.PATCH, "PATCH", { body: "Updated" }, token, content.id);
    assert.equal(missing.status, 428);
    const expectedBodyVersion = await mediaBodyVersion(content);
    const saved = await call(endpoint.PATCH, "PATCH", { body: "Updated", expectedBodyVersion }, token, content.id);
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).body, "Updated");
    const stale = await call(endpoint.PATCH, "PATCH", { body: "Stale", expectedBodyVersion }, token, content.id);
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).code, "BODY_CONFLICT");
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: content.id, action: "CONTENT_UPDATED" } });
    assert.equal(audit.actorId, "teacher", "header ID must not override the cookie identity");
  });
  await check("media route: invalid, expired and revoked sessions cannot write", async () => {
    assert.equal((await call(endpoint.PATCH, "PATCH", { title: "Invalid" }, "not-a-session", content.id)).status, 401);
    await db.authSession.update({ where: { id: auth.id }, data: { expiresAt: new Date(0) } });
    assert.equal((await call(endpoint.PATCH, "PATCH", { title: "Expired" }, token, content.id)).status, 401);
    await db.authSession.update({ where: { id: auth.id }, data: { expiresAt: new Date(Date.now() + 3600000), revokedAt: new Date() } });
    assert.equal((await call(endpoint.PATCH, "PATCH", { title: "Revoked" }, token, content.id)).status, 401);
    assert.equal((await db.content.findUniqueOrThrow({ where: { id: content.id } })).title, null);
  });
}
