-- AlterTable
ALTER TABLE "toss_webhook_events" ADD COLUMN "transmissionId" TEXT;
ALTER TABLE "toss_webhook_events" ADD COLUMN "retriedCount" INTEGER;
ALTER TABLE "toss_webhook_events" ADD COLUMN "transmissionTime" TEXT;
