-- CreateTable
CREATE TABLE "toss_webhook_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT,
    "recognized" BOOLEAN NOT NULL DEFAULT false,
    "bodyHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toss_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "toss_webhook_events_bodyHash_key" ON "toss_webhook_events"("bodyHash");

-- CreateIndex
CREATE INDEX "toss_webhook_events_eventType_receivedAt_idx" ON "toss_webhook_events"("eventType", "receivedAt");
