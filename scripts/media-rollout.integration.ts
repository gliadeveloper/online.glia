import assert from "node:assert/strict";
import { ApiError } from "../src/lib/api";
import { assertR2LibraryUploadConfig, mediaLibraryEnabled } from "../src/lib/media/rollout";
import { assertIsolatedCleanupBucket } from "../src/lib/media/cleanup-store";
import { assertUploadStoreAllowed, createR2UploadStore } from "../src/lib/media/r2-upload-store";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const code = (value: string) => (e: unknown) => e instanceof ApiError && e.code === value;

export async function runMediaRolloutIntegration(check: Check) {
  await check("rollout: absent/unknown values close both roles; admin opens only admin", async () => {
    for (const mode of [undefined, "off", "true", "ALL", " all"]) {
      assert.equal(mediaLibraryEnabled("admin", { MEDIA_LIBRARY_ROLLOUT: mode }), false);
      assert.equal(mediaLibraryEnabled("coach", { MEDIA_LIBRARY_ROLLOUT: mode }), false);
    }
    assert(mediaLibraryEnabled("admin", { MEDIA_LIBRARY_ROLLOUT: "admin" }));
    assert(!mediaLibraryEnabled("coach", { MEDIA_LIBRARY_ROLLOUT: "admin" }));
    assert(mediaLibraryEnabled("coach", { MEDIA_LIBRARY_ROLLOUT: "all" }));
  });
  const config = { bucket: "online-glia", endpoint: "https://fixture.r2.cloudflarestorage.com", legacyKeyPrefix: "online-glia/",
    accessKeyId: "fixture-key", secretAccessKey: "fixture-secret", region: "auto", publicBaseUrl: null };
  const env = { NODE_ENV: "production", MEDIA_R2_PRODUCTION_TARGET: config.endpoint + "/online-glia" };
  await check("rollout: production uploads require exact runtime, account, bucket, legacy prefix and no public URL", async () => {
    assert.doesNotThrow(() => assertR2LibraryUploadConfig(config, env));
    for (const patch of [{ NODE_ENV: "development" }, { MEDIA_R2_PRODUCTION_TARGET: undefined },
      { MEDIA_R2_PRODUCTION_TARGET: "https://other.r2.cloudflarestorage.com/online-glia" },
      { MEDIA_R2_PRODUCTION_TARGET: config.endpoint + "/online-glia-dev" }]) {
      assert.throws(() => assertR2LibraryUploadConfig(config, { ...env, ...patch }), code("R2_BUCKET_NOT_ISOLATED"));
    }
    for (const patch of [{ legacyKeyPrefix: "" }, { publicBaseUrl: "https://public.example.invalid" }]) {
      assert.throws(() => assertR2LibraryUploadConfig({ ...config, ...patch }, env), code("R2_BUCKET_NOT_ISOLATED"));
    }
    assert.throws(() => assertIsolatedCleanupBucket(config.bucket), /CLEANUP_BUCKET_NOT_ISOLATED/);
  });
  await check("rollout: only a validated factory store may pass the production service boundary (no network)", async () => {
    const vars = { ...env, R2_BUCKET: config.bucket, R2_ENDPOINT: config.endpoint,
      R2_LEGACY_KEY_PREFIX: config.legacyKeyPrefix, R2_PUBLIC_BASE_URL: "", R2_ACCESS_KEY_ID: config.accessKeyId, R2_SECRET_ACCESS_KEY: config.secretAccessKey };
    const previous = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
    try {
      Object.assign(process.env, vars);
      const store = createR2UploadStore();
      assert.doesNotThrow(() => assertUploadStoreAllowed(store));
      assert.throws(() => assertUploadStoreAllowed({ ...store }), code("R2_BUCKET_NOT_ISOLATED"));
      delete process.env.MEDIA_R2_PRODUCTION_TARGET;
      assert.throws(createR2UploadStore, code("R2_BUCKET_NOT_ISOLATED"));
    } finally {
      for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });
}
