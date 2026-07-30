-- Course access period: catalog policy + enrollment instance window.
-- Backfill: existing rows get LIFETIME (validUntil null) — no access regression.

-- Course catalog fallback
ALTER TABLE "courses" ADD COLUMN "defaultAccessDuration" TEXT NOT NULL DEFAULT 'LIFETIME';
ALTER TABLE "courses" ADD COLUMN "defaultAccessDays" INTEGER;

-- ProductItem SKU policy (COURSE_ACCESS)
ALTER TABLE "product_items" ADD COLUMN "accessDuration" TEXT NOT NULL DEFAULT 'LIFETIME';
ALTER TABLE "product_items" ADD COLUMN "accessDays" INTEGER;

-- Enrollment instance window + snapshot
-- SQLite: non-constant DEFAULT not allowed on ADD COLUMN — use placeholder then backfill.
ALTER TABLE "enrollments" ADD COLUMN "validFrom" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
ALTER TABLE "enrollments" ADD COLUMN "validUntil" DATETIME;
ALTER TABLE "enrollments" ADD COLUMN "accessDuration" TEXT NOT NULL DEFAULT 'LIFETIME';
ALTER TABLE "enrollments" ADD COLUMN "accessDays" INTEGER;
ALTER TABLE "enrollments" ADD COLUMN "expiredAt" DATETIME;

UPDATE "enrollments" SET "validFrom" = "enrolledAt";

CREATE INDEX "enrollments_userId_status_idx" ON "enrollments"("userId", "status");
CREATE INDEX "enrollments_validUntil_idx" ON "enrollments"("validUntil");

-- Demo catalog: VOD-only product = 90-day access
UPDATE "product_items"
SET "accessDuration" = 'FIXED_DAYS', "accessDays" = 90
WHERE "id" IN (
  SELECT pi."id"
  FROM "product_items" pi
  INNER JOIN "products" p ON p."id" = pi."productId"
  WHERE p."slug" = 'nextjs-vod-only' AND pi."kind" = 'COURSE_ACCESS'
);
