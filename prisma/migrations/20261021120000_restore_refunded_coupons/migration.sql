-- Preserve every order's coupon history while allowing a fully refunded coupon to be reused.
DROP INDEX "orders_couponIssueId_key";
CREATE INDEX "orders_couponIssueId_idx" ON "orders"("couponIssueId");
CREATE UNIQUE INDEX "orders_active_couponIssueId_key" ON "orders"("couponIssueId")
  WHERE "status" IN ('PENDING', 'PAID', 'PARTIALLY_REFUNDED');

UPDATE "shop_coupon_issues" AS issue
SET "status" = 'ISSUED', "usedAt" = NULL
WHERE issue."status" = 'USED'
  AND EXISTS (
    SELECT 1 FROM "orders" AS refunded
    WHERE refunded."couponIssueId" = issue."id" AND refunded."status" = 'REFUNDED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "orders" AS active
    WHERE active."couponIssueId" = issue."id"
      AND active."status" IN ('PENDING', 'PAID', 'PARTIALLY_REFUNDED')
  );
