-- CreateEnum
CREATE TYPE "ShopCouponDiscountType" AS ENUM ('FIXED', 'PERCENT');

-- CreateEnum
CREATE TYPE "ShopCouponValidityKind" AS ENUM ('RANGE', 'DAYS_FROM_ISSUE');

-- CreateEnum
CREATE TYPE "ShopCouponIssueStatus" AS ENUM ('ISSUED', 'RESERVED', 'USED');

-- CreateTable
CREATE TABLE "shop_coupons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" "ShopCouponDiscountType" NOT NULL,
    "discountAmount" INTEGER,
    "discountPercent" INTEGER,
    "maxDiscountAmount" INTEGER,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "issueStartsAt" TIMESTAMP(3) NOT NULL,
    "issueEndsAt" TIMESTAMP(3) NOT NULL,
    "validityKind" "ShopCouponValidityKind" NOT NULL,
    "validStartsAt" TIMESTAMP(3),
    "validEndsAt" TIMESTAMP(3),
    "validDays" INTEGER,
    "issueLimit" INTEGER,
    "issuedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_coupon_products" (
    "couponId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "shop_coupon_products_pkey" PRIMARY KEY ("couponId","productId")
);

-- CreateTable
CREATE TABLE "shop_coupon_issues" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ShopCouponIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "discountType" "ShopCouponDiscountType" NOT NULL,
    "discountAmount" INTEGER,
    "discountPercent" INTEGER,
    "maxDiscountAmount" INTEGER,
    "minOrderAmount" INTEGER NOT NULL,
    "validStartsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "shop_coupon_issues_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "couponIssueId" TEXT;

-- CreateIndex
CREATE INDEX "shop_coupons_isActive_issueStartsAt_issueEndsAt_idx" ON "shop_coupons"("isActive", "issueStartsAt", "issueEndsAt");

-- CreateIndex
CREATE INDEX "shop_coupon_products_productId_idx" ON "shop_coupon_products"("productId");

-- CreateIndex
CREATE INDEX "shop_coupon_issues_userId_status_idx" ON "shop_coupon_issues"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shop_coupon_issues_couponId_userId_key" ON "shop_coupon_issues"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_couponIssueId_key" ON "orders"("couponIssueId");

-- AddForeignKey
ALTER TABLE "shop_coupon_products" ADD CONSTRAINT "shop_coupon_products_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "shop_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_coupon_products" ADD CONSTRAINT "shop_coupon_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_coupon_issues" ADD CONSTRAINT "shop_coupon_issues_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "shop_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_coupon_issues" ADD CONSTRAINT "shop_coupon_issues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_couponIssueId_fkey" FOREIGN KEY ("couponIssueId") REFERENCES "shop_coupon_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
