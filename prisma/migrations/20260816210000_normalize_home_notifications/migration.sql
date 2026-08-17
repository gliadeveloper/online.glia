-- The legacy notifications table mixed domain events, presentation strings, and
-- recipient read state. Replace it with event + per-user delivery relations.
DROP TABLE IF EXISTS "notifications";
DROP TYPE IF EXISTS "NotificationType";

CREATE TYPE "NotificationType" AS ENUM (
  'COACHING_SESSION_PUBLISHED',
  'COACHING_COMMENT',
  'LIVE_STARTED'
);

CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

CREATE TABLE "live_sessions" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_events" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "coachingSessionId" TEXT,
  "coachingMessageId" TEXT,
  "liveSessionId" TEXT,
  CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_events_source_matches_type" CHECK (
    ("type" = 'COACHING_SESSION_PUBLISHED' AND "coachingSessionId" IS NOT NULL AND "coachingMessageId" IS NULL AND "liveSessionId" IS NULL)
    OR ("type" = 'COACHING_COMMENT' AND "coachingSessionId" IS NULL AND "coachingMessageId" IS NOT NULL AND "liveSessionId" IS NULL)
    OR ("type" = 'LIVE_STARTED' AND "coachingSessionId" IS NULL AND "coachingMessageId" IS NULL AND "liveSessionId" IS NOT NULL)
  )
);

CREATE TABLE "notification_deliveries" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_sessions_lessonId_key" ON "live_sessions"("lessonId");
CREATE INDEX "live_sessions_coachId_status_idx" ON "live_sessions"("coachId", "status");
CREATE INDEX "live_sessions_status_startedAt_idx" ON "live_sessions"("status", "startedAt");
CREATE UNIQUE INDEX "notification_events_coachingSessionId_key" ON "notification_events"("coachingSessionId");
CREATE UNIQUE INDEX "notification_events_coachingMessageId_key" ON "notification_events"("coachingMessageId");
CREATE UNIQUE INDEX "notification_events_liveSessionId_key" ON "notification_events"("liveSessionId");
CREATE INDEX "notification_events_type_occurredAt_idx" ON "notification_events"("type", "occurredAt");
CREATE UNIQUE INDEX "notification_deliveries_eventId_userId_key" ON "notification_deliveries"("eventId", "userId");
CREATE INDEX "notification_deliveries_userId_readAt_createdAt_idx" ON "notification_deliveries"("userId", "readAt", "createdAt");

ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_coachingSessionId_fkey" FOREIGN KEY ("coachingSessionId") REFERENCES "coaching_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_coachingMessageId_fkey" FOREIGN KEY ("coachingMessageId") REFERENCES "coaching_session_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
