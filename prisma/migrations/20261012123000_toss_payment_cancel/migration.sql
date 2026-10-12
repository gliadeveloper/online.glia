-- AlterTable
ALTER TABLE "refunds" ADD COLUMN "transactionKey" TEXT;
ALTER TABLE "refunds" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "refunds" ADD COLUMN "cancelStatus" TEXT;
ALTER TABLE "refunds" ADD COLUMN "refundableAmount" INTEGER;
ALTER TABLE "refunds" ADD COLUMN "easyPayDiscountAmount" INTEGER;
ALTER TABLE "refunds" ADD COLUMN "receiptKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "refunds_transactionKey_key" ON "refunds"("transactionKey");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotencyKey_key" ON "refunds"("idempotencyKey");
