import assert from "node:assert/strict";
import type { Prisma } from "../src/generated/prisma/client";
import { normalizeBlockNoteWrite } from "../src/lib/media/normalize-blocknote";
import { extractMediaReferences } from "../src/lib/media/body-references";
import { createLibraryUploader, libraryFileRule } from "../src/lib/media/library-client";
import { normalizeMarkdownDraft } from "../src/lib/markdown-content";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const metadata = (blocks: Prisma.InputJsonValue[]) => ({ blocknote: { version: 2, blocks } });
const code = (value: string) => (error: unknown) => (error as { code?: string }).code === value;
const response = (body: unknown, status = 200) => Response.json(body, { status });
const reservation = { assetId: "asset", uploadId: "upload", status: "ISSUED", mediaUrl: null,
  uploadUrl: "https://storage.example.invalid/staging", uploadHeaders: { "content-type": "image/png", "content-length": "3" },
  uploadExpiresAt: new Date(Date.now() + 60000).toISOString() };
const completed = { ...reservation, status: "COMPLETED", mediaUrl: "/api/media/r2?key=asset", uploadUrl: null, uploadHeaders: null };

/** Pure serialization and transport tests: no database, network, or R2 I/O. */
export async function runMediaEditorIntegration(check: Check) {
  await check("editor: canonical blocks replace untrusted Markdown and preserve media mirrors", async () => {
    const blocks = ["image", "video", "audio"].map(type => ({ type, props: { url: `/api/media/r2?key=${type}` } }));
    const result = await normalizeBlockNoteWrite({ body: "discard this ![x](/api/media/r2?key=hidden)", metadata: metadata(blocks) });
    assert(!result.body?.includes("hidden"));
    const groups = extractMediaReferences(result);
    assert.deepEqual(groups[0].map(r => r.key).sort(), ["audio", "image", "video"]);
    assert.deepEqual(groups[1].map(r => r.key).sort(), ["audio", "image", "video"]);
  });
  await check("editor: image syntax survives empty alt and URL-identical alt normalization", async () => {
    assert.equal(normalizeMarkdownDraft("![](/image) ![/video](/video) [](/link) [/link](/link)"), "![](/image) ![/video](/video) /link /link");
  });
  await check("editor: heading, nested list, table, styles and code serialize without HTML execution", async () => {
    const result = await normalizeBlockNoteWrite({ metadata: metadata([
      { type: "heading", props: { level: 2 }, content: "제목" },
      { type: "bulletListItem", content: [{ type: "text", text: "부모", styles: { bold: true } }], children: [{ type: "bulletListItem", content: "자식" }] },
      { type: "table", content: { type: "tableContent", rows: [{ cells: ["이름", "값"] }, { cells: ["첫째", "둘째"] }] } },
      { type: "codeBlock", content: '<script>alert("x")</script>' },
    ]) });
    assert.match(result.body!, /## 제목/);
    assert.match(result.body!, /\*\*부모\*\*/);
    assert.match(result.body!, /자식/);
    assert.match(result.body!, /\| 이름\s+\| 값\s+\|/);
    assert.match(result.body!, /```/);
  });
  await check("editor: legacy documents stay unchanged, canonical body-only edits are rejected", async () => {
    const legacy = { body: "old", metadata: { blocknote: { version: 1, blocks: [] } } };
    assert.deepEqual(await normalizeBlockNoteWrite(legacy), legacy);
    const previous = metadata([{ type: "paragraph", content: "new" }]);
    await assert.rejects(normalizeBlockNoteWrite({ body: "other" }, previous), code("BLOCKNOTE_BLOCKS_REQUIRED"));
    await assert.rejects(normalizeBlockNoteWrite(legacy, previous), code("INVALID_BLOCKNOTE_BODY"));
    await assert.rejects(normalizeBlockNoteWrite({ body: "other", metadata: {} }, previous), code("INVALID_BLOCKNOTE_BODY"));
    assert.deepEqual(await normalizeBlockNoteWrite({}, previous), {});
    assert.deepEqual(await normalizeBlockNoteWrite({ body: null, metadata: null }, previous), { body: null, metadata: null });
  });
  await check("editor: malformed, duplicate, unknown and oversized blocks fail before persistence", async () => {
    for (const blocks of [[{ type: "custom" }], [{ type: "paragraph", id: "a" }, { type: "paragraph", id: "a" }], [{ type: "paragraph", children: "bad" }]]) {
      await assert.rejects(normalizeBlockNoteWrite({ metadata: metadata(blocks) }), code("INVALID_BLOCKNOTE_BODY"));
    }
    await assert.rejects(normalizeBlockNoteWrite({ metadata: metadata([{ type: "paragraph", content: "x".repeat(2_000_001) }]) }), code("BODY_TOO_LARGE"));
    await assert.rejects(normalizeBlockNoteWrite({ metadata: { blocknote: { version: 2, blocks: null } } }), code("INVALID_BLOCKNOTE_BODY"));
  });
  await check("editor: server DOM globals are restored on success and conversion failure", async () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    const { serializeDefaultBlocks } = await import("../src/lib/media/blocknote-markdown.mjs");
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => normalizeBlockNoteWrite({ metadata: metadata([{ type: "paragraph", content: `doc-${i}` }]) })));
    assert.deepEqual(results.map(r => r.body), Array.from({ length: 5 }, (_, i) => `doc-${i}`));
    assert.throws(() => serializeDefaultBlocks([{ type: "missing-block-type" }]));
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "window"), windowDescriptor);
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "document"), documentDescriptor);
  });
  await check("editor upload: supported extension fallback and size limits before network", async () => {
    assert.equal(libraryFileRule({ name: "voice.M4A", type: "", size: 10 }).kind, "AUDIO");
    for (const file of [{ name: "bad.exe", type: "", size: 1 }, { name: "x.png", type: "image/png", size: 0 }, { name: "x.png", type: "image/png", size: 11 * 1024 * 1024 }]) assert.throws(() => libraryFileRule(file));
    const uploader = createLibraryUploader("coach", async () => { assert.fail("must not fetch"); });
    await assert.rejects(uploader(new File(["png"], "x.png", { type: "image/png" }), "SHARED"), /관리자/);
  });
  await check("editor upload: lost completion response retries completion without another PUT", async () => {
    const calls: string[] = []; let fail = true;
    const file = new File(["png"], "x.png", { type: "image/png" });
    const uploader = createLibraryUploader("coach", async (input, init) => {
      calls.push(`${init?.method} ${input}`);
      if (init?.method === "PUT") {
        assert.equal(init.body, file); assert.equal(init.credentials, "omit");
        assert.equal(new Headers(init.headers).has("content-length"), false);
        return new Response(null, { status: 200 });
      }
      if (String(input).endsWith("/complete")) {
        if (fail) { fail = false; throw new Error("lost response"); }
        return response(completed);
      }
      return response(reservation);
    });
    await assert.rejects(uploader(file, "PERSONAL"), /lost response/);
    assert.equal((await uploader(file, "PERSONAL")).url, completed.mediaUrl);
    assert.equal(calls.filter(x => x.startsWith("PUT")).length, 1);
    assert.equal(calls.filter(x => x.endsWith("/uploads")).length, 1);
    assert.equal(calls.filter(x => x.endsWith("/complete")).length, 2);
    await uploader(file, "PERSONAL"); assert.equal(calls.length, 4);
  });
  await check("editor upload: lost reservation response retains idempotency key", async () => {
    const keys: string[] = [];
    const uploader = createLibraryUploader("admin", async (_input, init) => {
      keys.push(JSON.parse(String(init?.body)).idempotencyKey);
      if (keys.length === 1) throw new Error("lost reservation");
      return response(completed);
    });
    const file = new File(["png"], "x.png");
    await assert.rejects(uploader(file, "SHARED"), /lost reservation/);
    await uploader(file, "SHARED");
    assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  });
  await check("editor upload: transient PUT failure retries automatically on the same reservation", async () => {
    let reserves = 0, puts = 0, completes = 0;
    const uploader = createLibraryUploader("coach", async (input, init) => {
      if (init?.method === "PUT") return new Response(null, { status: ++puts === 1 ? 503 : 200 });
      if (String(input).endsWith("/complete")) { completes++; return response(completed); }
      reserves++; return response(reservation);
    });
    const file = new File(["png"], "x.png");
    await uploader(file, "PERSONAL");
    assert.deepEqual([reserves, puts, completes], [1, 2, 1]);
  });
  await check("editor upload: three failed PUT responses can still recover a completed asset", async () => {
    let puts = 0, completes = 0;
    const uploader = createLibraryUploader("coach", async (input, init) => {
      if (init?.method === "PUT") { puts++; throw new Error("response lost"); }
      if (String(input).endsWith("/complete")) { completes++; return response(completed); }
      return response(reservation);
    });
    assert.equal((await uploader(new File(["png"], "x.png"), "PERSONAL")).url, completed.mediaUrl);
    assert.deepEqual([puts, completes], [3, 1]);
  });
  await check("editor upload: lost fallback completion response retries verification without another PUT", async () => {
    let puts = 0, completes = 0;
    const uploader = createLibraryUploader("coach", async (input, init) => {
      if (init?.method === "PUT") { puts++; return new Response(null, { status: 503 }); }
      if (String(input).endsWith("/complete")) { if (++completes === 1) throw new Error("unknown completion"); return response(completed); }
      return response(reservation);
    });
    const file = new File(["png"], "x.png");
    await assert.rejects(uploader(file, "PERSONAL"), /unknown completion/);
    await uploader(file, "PERSONAL"); assert.deepEqual([puts, completes], [3, 2]);
  });
  await check("editor upload: confirmed missing staging permits retransmission after fallback uncertainty", async () => {
    let puts = 0, completes = 0, reserves = 0;
    const uploader = createLibraryUploader("coach", async (input, init) => {
      if (init?.method === "PUT") { puts++; return new Response(null, { status: puts <= 3 ? 503 : 200 }); }
      if (String(input).endsWith("/complete")) {
        completes++;
        if (completes === 1) throw new Error("unknown completion");
        return completes === 2 ? response({ error: "absent", code: "MEDIA_STAGING_ABSENT" }, 409) : response(completed);
      }
      reserves++; return response(reservation);
    });
    const file = new File(["png"], "x.png");
    await assert.rejects(uploader(file, "PERSONAL"), /unknown completion/);
    await assert.rejects(uploader(file, "PERSONAL"), /absent/);
    assert.equal(puts, 3);
    await uploader(file, "PERSONAL"); assert.deepEqual([puts, completes, reserves], [4, 3, 1]);
  });
  await check("editor upload: incomplete verification and non-proxy URLs never reach the editor", async () => {
    for (const result of [{ ...completed, status: "PROMOTING" }, { ...completed, mediaUrl: reservation.uploadUrl }]) {
      const uploader = createLibraryUploader("coach", async () => response(result));
      await assert.rejects(uploader(new File(["png"], "x.png"), "PERSONAL"), /확인이 끝나지/);
    }
  });
  await check("editor upload: expired reservations never PUT", async () => {
    let calls = 0;
    const uploader = createLibraryUploader("coach", async () => { calls++; return response({ ...reservation, uploadExpiresAt: new Date(0).toISOString() }); });
    await assert.rejects(uploader(new File(["png"], "x.png"), "PERSONAL"), /만료/);
    assert.equal(calls, 1);
  });
}
