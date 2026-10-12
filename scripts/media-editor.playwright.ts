import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "media-editor.browser.spec.ts", workers: 1, timeout: 60000,
  expect: { timeout: 15000 }, outputDir: "../.media-editor-test/results",
  use: { baseURL: "http://127.0.0.1:3214", channel: "chrome", headless: true, screenshot: "only-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next dev scripts/fixtures/media-editor --hostname 127.0.0.1 --port 3214", url: "http://127.0.0.1:3214", timeout: 120000, reuseExistingServer: false, cwd: ".." },
});
