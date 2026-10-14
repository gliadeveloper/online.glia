-- AlterTable
ALTER TABLE "shop_coupons" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "shop_coupons" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shop_coupons_code_key" ON "shop_coupons"("code");
