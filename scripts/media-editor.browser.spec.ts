import { test, expect, type Page } from "@playwright/test";
import { mediaBodyVersion } from "../src/lib/media/body-version";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXx8AAAAASUVORK5CYII=", "base64");
const item = (id: string) => ({ id, scope: id === "shared" ? "SHARED" : "PERSONAL", kind: "IMAGE", originalName: `${id}.png`, createdAt: "2026-10-08T00:00:00Z",
  libraryStatus: "ACTIVE", version: "2026-10-08T00:00:00.000Z", canManage: id !== "shared", usageCount: 2, trashedAt: null, trashExpiresAt: null,
  files: [{ id, role: "ORIGINAL", mimeType: "image/png", byteSize: "100", url: `/api/media/r2?key=${id}` }] });
async function mockLibrary(page: Page) {
  await page.route("**/api/**", route => route.abort());
  await page.route("**/api/*/media/library/capabilities", route => route.fulfill({ json: { libraryEnabled: true, uploadEnabled: true } }));
  await page.route("**/api/media/r2?**", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.route("**/api/*/media/library?**", route => {
    const query = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { items: [item(query.get("scope") === "SHARED" ? "shared" : "personal")], nextCursor: null } });
  });
}

async function pasteImage(page: Page) {
  await page.locator(".bn-editor").click();
  await page.locator(".bn-editor").evaluate((editor, bytes) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], "fixture.png", { type: "image/png" }));
    editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, [...png]);
}

for (const mode of ["lesson", "coach", "admin"]) {
  test(`${mode}: disabled library preserves contextual legacy upload and blocks saving while uploading`, async ({ page }) => {
    await mockLibrary(page);
    await page.route("**/api/*/media/library/capabilities", route => route.fulfill({ json: { libraryEnabled: false, uploadEnabled: false } }));
    let calls = 0, requestBody = "";
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const role = mode === "admin" ? "admin" : "coach";
    const endpoint = mode === "lesson" ? "upload-image" : "upload-coaching-image";
    await page.route(`**/api/${role}/media/${endpoint}`, async route => {
      calls++; requestBody = route.request().postData() ?? "";
      await pending;
      await route.fulfill({ json: { publicUrl: "/api/media/r2?key=legacy-upload" } });
    });
    await page.goto(`/?mode=${mode}`);
    const save = page.getByRole("button", { name: mode === "coach" ? "임시 저장" : "저장", exact: true });
    await expect(save).toBeEnabled();
    await expect(page.getByRole("button", { name: "자료 보관함", exact: true })).toHaveCount(0);
    await pasteImage(page);
    await expect.poll(() => calls).toBe(1);
    await expect(save).toBeDisabled();
    expect(requestBody).toContain(mode === "lesson" ? "fixture-lesson" : "fixture-session");
    if (mode === "lesson") expect(requestBody).toContain("fixture-course");
    release();
    await expect(page.locator('.bn-editor img[src="/api/media/r2?key=legacy-upload"]')).toHaveCount(1);
    await expect(save).toBeEnabled();
  });
}

test("capability errors never silently choose legacy upload; retry preserves draft", async ({ page }) => {
  await mockLibrary(page);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  let failed = true, uploads = 0;
  await page.route("**/api/*/media/library/capabilities", route => failed ? route.fulfill({ status: 503, json: { error: "Unavailable" } }) : route.fulfill({ json: { libraryEnabled: true, uploadEnabled: false } }));
  await page.route("**/api/*/media/upload-*", route => { uploads++; return route.abort(); });
  await page.goto("/");
  await expect(page.getByText("업로드 설정을 확인하지 못했습니다.", { exact: false })).toBeVisible();
  await page.locator(".bn-editor").fill("설정 재시도 중에도 보존할 초안");
  await pasteImage(page);
  failed = false; await page.getByRole("button", { name: "다시 확인", exact: true }).click();
  await page.getByRole("button", { name: "자료 보관함", exact: true }).click();
  await expect(page.getByRole("button", { name: "새 업로드", exact: true })).toHaveCount(0);
  await expect(page.locator(".bn-editor")).toContainText("설정 재시도 중에도 보존할 초안");
  expect(uploads).toBe(0); expect(errors).toEqual([]);
});

test("same tab, preview and insert retain the library; first-save props retain the draft", async ({ page }) => {
  await mockLibrary(page);
  let saved: { id: string; type: string; body: string; metadata: unknown };
  let nextVersion: string | undefined;
  await page.route("**/api/coach/lessons/fixture-lesson/contents", async route => {
    saved = { ...route.request().postDataJSON(), id: "saved-content" };
    await route.fulfill({ json: saved });
  });
  await page.route("**/api/coach/contents/saved-content", async route => {
    nextVersion = route.request().postDataJSON().expectedBodyVersion;
    await route.fulfill({ status: 409, json: { error: "충돌 시 초안 보존" } });
  });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const save = page.getByRole("button", { name: "저장", exact: true });
  await expect(save).toBeEnabled();
  await page.locator(".bn-editor").fill("작성 중 초안");
  await page.getByRole("button", { name: "자료 보관함", exact: true }).click();
  await expect(page.getByRole("button", { name: /personal.png/ })).toBeVisible();
  await page.getByRole("button", { name: "내 자료", exact: true }).click();
  await expect(page.getByRole("button", { name: /personal.png/ })).toBeVisible();
  await page.getByRole("button", { name: "공통 자료", exact: true }).click();
  await page.getByRole("button", { name: /shared.png/ }).click();
  await expect(page.getByRole("img", { name: "shared.png" })).toBeVisible();
  await page.getByRole("button", { name: "본문에 넣기" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".bn-editor img")).toHaveAttribute("src", "/api/media/r2?key=shared");
  await save.click();
  await expect.poll(() => saved?.id).toBe("saved-content");
  await expect(save).toBeEnabled();
  await page.getByRole("button", { name: "서버 props 갱신" }).click();
  await expect(page.locator(".bn-editor")).toContainText("작성 중 초안");
  await expect(page.locator(".bn-editor img")).toHaveCount(1);
  await save.click();
  await expect(page.getByText("충돌 시 초안 보존")).toBeVisible();
  expect(nextVersion).toBe(await mediaBodyVersion(saved!));
  expect(errors).toEqual([]);
});

for (const mode of ["lesson", "coach", "admin"]) {
  test(`${mode}: upload verification blocks saving, then sends version 2 and preserves conflict draft`, async ({ page }) => {
    await mockLibrary(page);
    const role = mode === "admin" ? "admin" : "coach";
    let release!: () => void;
    const completion = new Promise<void>(resolve => { release = resolve; });
    let puts = 0;
    await page.route(`**/api/${role}/media/library/uploads`, route => route.fulfill({ json: {
      assetId: "upload", uploadId: "upload", status: "ISSUED", mediaUrl: null,
      uploadUrl: "http://127.0.0.1:3214/api/fake-staging", uploadHeaders: { "content-type": "image/png" }, uploadExpiresAt: new Date(Date.now() + 60000).toISOString(),
    } }));
    await page.route("**/api/fake-staging", route => { puts++; return route.fulfill({ status: 200 }); });
    await page.route(`**/api/${role}/media/library/uploads/upload/complete`, async route => {
      await completion;
      await route.fulfill({ json: { status: "COMPLETED", assetId: "upload", mediaUrl: "/api/media/r2?key=upload" } });
    });
    const savePath = mode === "lesson" ? "**/api/coach/lessons/fixture-lesson/contents" : mode === "admin" ? "**/api/admin/coaching/sessions/fixture-session" : "**/api/coach/sessions/fixture-session";
    let payload: Record<string, unknown> | undefined;
    await page.route(savePath, async route => { payload = route.request().postDataJSON(); await route.fulfill({ status: 409, json: { error: "다른 사용자가 본문을 수정했습니다." } }); });
    await page.goto(`/?mode=${mode}`);
    const save = page.getByRole("button", { name: mode === "coach" ? "임시 저장" : "저장", exact: true });
    await expect(save).toBeEnabled();
    await page.getByRole("button", { name: "자료 보관함", exact: true }).click();
    await page.getByRole("button", { name: "새 업로드", exact: true }).click();
    await page.getByLabel("새 미디어 파일").setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("status")).toContainText("파일 확인 중");
    await expect(save).toBeDisabled();
    await expect(page.locator('.bn-editor img[src="/api/media/r2?key=upload"]')).toHaveCount(0);
    release();
    await expect(save).toBeEnabled();
    await expect(page.locator('.bn-editor img[src="/api/media/r2?key=upload"]')).toHaveCount(1);
    await save.click();
    await expect(page.getByText("다른 사용자가 본문을 수정했습니다.")).toBeVisible();
    await expect(page.locator('.bn-editor img[src="/api/media/r2?key=upload"]')).toHaveCount(1);
    expect(puts).toBe(1);
    const metadata = payload?.[mode === "lesson" ? "metadata" : "bodyMetadata"] as { blocknote: { version: number; blocks: unknown[] } };
    expect(metadata.blocknote.version).toBe(2);
    expect(JSON.stringify(metadata.blocknote.blocks)).toContain("/api/media/r2?key=upload");
  });
}

test("server conversion executes in the Next runtime without React/Yjs dependencies", async ({ request }) => {
  const result = await request.post("/api/normalize", { data: { body: "discard", metadata: { blocknote: { version: 2, blocks: [{ type: "paragraph", content: "서버 변환" }, { type: "audio", props: { url: "/api/media/r2?key=audio" } }] } } } });
  expect(result.ok()).toBeTruthy();
  const data = await result.json(); expect(data.body).toContain("서버 변환"); expect(data.body).toContain('<audio src="/api/media/r2?key=audio"'); expect(data.body).not.toContain("discard");
});

for (const mode of ["lesson", "admin"]) {
  test(`${mode}: trash and restore preserve inserted media and never insert from trash`, async ({ page }) => {
    await mockLibrary(page);
    if (mode === "lesson") await page.setViewportSize({ width: 390, height: 844 });
    const id = mode === "admin" ? "shared" : "personal";
    let status = "ACTIVE", version = item(id).version, mutations = 0;
    await page.route("**/api/*/media/library?**", route => {
      const query = new URL(route.request().url()).searchParams;
      return route.fulfill({ json: { items: query.get("status") === status && query.get("scope") === item(id).scope ? [{ ...item(id), libraryStatus: status, version, canManage: true, trashExpiresAt: status === "TRASHED" ? "2026-11-07T00:00:00.000Z" : null }] : [], nextCursor: null } });
    });
    await page.route(`**/api/*/media/library/${id}`, route => {
      const body = route.request().postDataJSON(); expect(body.expectedVersion).toBe(version);
      status = body.libraryStatus; mutations++; version = `2026-10-08T00:00:00.00${mutations}Z`;
      return route.fulfill({ json: { id, libraryStatus: status, version } });
    });
    await page.goto(`/?mode=${mode}`);
    const open = page.getByRole("button", { name: "자료 보관함", exact: true });
    await open.click();
    if (mode === "admin") await page.getByRole("button", { name: "공통 자료", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`${id}.png`) }).click();
    await page.getByRole("button", { name: "본문에 넣기", exact: true }).click();
    await expect(page.locator(`.bn-editor img[src="/api/media/r2?key=${id}"]`)).toHaveCount(1);
    await open.click(); await page.getByRole("button", { name: new RegExp(`${id}.png`) }).click();
    await page.getByRole("button", { name: "휴지통으로 이동", exact: true }).click();
    await expect(page.getByText("이 자료를 휴지통으로 옮길까요?", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "휴지통으로 이동", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "휴지통으로 옮겼습니다" })).toBeVisible();
    await page.getByRole("button", { name: "휴지통 보기" }).click();
    await page.getByRole("button", { name: new RegExp(`${id}.png`) }).click();
    await expect(page.getByRole("button", { name: "본문에 넣기", exact: true })).toHaveCount(0);
    await expect(page.getByText("삭제 유예 종료:", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "복원", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "자료를 복원했습니다" })).toBeVisible();
    await page.getByRole("button", { name: "보관함 보기" }).click();
    await expect(page.getByRole("button", { name: new RegExp(`${id}.png`) })).toBeVisible();
    await expect(page.locator(`.bn-editor img[src="/api/media/r2?key=${id}"]`)).toHaveCount(1);
    expect(mutations).toBe(2);
  });
}

test("coach shared assets expose selection without management or shared trash", async ({ page }) => {
  await mockLibrary(page); await page.goto("/");
  await page.getByRole("button", { name: "자료 보관함", exact: true }).click();
  await page.getByRole("button", { name: "공통 자료", exact: true }).click();
  await page.getByRole("button", { name: /shared.png/ }).click();
  await expect(page.getByRole("button", { name: "본문에 넣기", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "휴지통으로 이동" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "휴지통 보기" })).toHaveCount(0);
});

test("stale library mutation refreshes state without silently retrying", async ({ page }) => {
  await mockLibrary(page); let calls = 0;
  await page.route("**/api/coach/media/library/personal", route => { calls++; return route.fulfill({ status: 409, json: { code: "MEDIA_LIBRARY_CONFLICT", error: "자료 상태가 변경되었습니다." } }); });
  await page.goto("/"); await page.getByRole("button", { name: "자료 보관함", exact: true }).click();
  await page.getByRole("button", { name: /personal.png/ }).click();
  await page.getByRole("button", { name: "휴지통으로 이동", exact: true }).click();
  await page.getByRole("button", { name: "휴지통으로 이동", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "자료 상태가 변경되었습니다." })).toBeVisible();
  await expect(page.getByRole("button", { name: /personal.png/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "휴지통으로 이동", exact: true })).toHaveCount(0);
  expect(calls).toBe(1);
});
