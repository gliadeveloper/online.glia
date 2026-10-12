-- CreateEnum
CREATE TYPE "OrderCheckout" AS ENUM ('APPLICATION', 'TOSS');

-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "checkout" "OrderCheckout" NOT NULL DEFAULT 'APPLICATION';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "environment" "PaymentEnvironment";

-- CreateIndex
CREATE INDEX "orders_userId_checkout_status_idx" ON "orders"("userId", "checkout", "status");
