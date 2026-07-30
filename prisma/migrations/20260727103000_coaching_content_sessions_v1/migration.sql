-- Coaching v1: content sessions + async Q&A (SQLite)

PRAGMA foreign_keys=OFF;

-- Drop legacy coaching runtime tables
DROP TABLE IF EXISTS "coaching_session_events";
DROP TABLE IF EXISTS "coaching_intakes";
DROP TABLE IF EXISTS "coaching_feedbacks";
DROP TABLE IF EXISTS "coaching_session_messages";
DROP TABLE IF EXISTS "coaching_session_conversations";
DROP TABLE IF EXISTS "coaching_session_progress";
DROP TABLE IF EXISTS "coaching_sessions";

-- Rebuild coaching_offerings (remove booking-era columns)
CREATE TABLE "coaching_offerings_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "totalSessions" INTEGER NOT NULL,
    "validDays" INTEGER NOT NULL,
    "coachId" TEXT,
    "courseId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_offerings_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "coaching_offerings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "coaching_offerings_new" (
    "id", "title", "slug", "description", "totalSessions", "validDays",
    "coachId", "courseId", "isActive", "createdAt", "updatedAt"
)
SELECT
    "id", "title", "slug", "description", "totalSessions", "validDays",
    "coachId", "courseId", "isActive", "createdAt", "updatedAt"
FROM "coaching_offerings";

DROP TABLE "coaching_offerings";
ALTER TABLE "coaching_offerings_new" RENAME TO "coaching_offerings";
CREATE UNIQUE INDEX "coaching_offerings_slug_key" ON "coaching_offerings"("slug");
CREATE INDEX "coaching_offerings_coachId_idx" ON "coaching_offerings"("coachId");
CREATE INDEX "coaching_offerings_courseId_idx" ON "coaching_offerings"("courseId");

-- Session templates
CREATE TABLE "coaching_offering_session_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "sessionNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "scheduledOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "coaching_offering_session_templates_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "coaching_offerings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "coaching_offering_session_templates_offeringId_sessionNo_key" ON "coaching_offering_session_templates"("offeringId", "sessionNo");

-- Rebuild coaching_entitlements
CREATE TABLE "coaching_entitlements_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coachingOfferingId" TEXT NOT NULL,
    "coachId" TEXT,
    "courseId" TEXT,
    "enrollmentId" TEXT,
    "totalSessions" INTEGER NOT NULL,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_entitlements_coachingOfferingId_fkey" FOREIGN KEY ("coachingOfferingId") REFERENCES "coaching_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coaching_entitlements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "coaching_entitlements_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "coaching_entitlements_new" (
    "id", "userId", "coachingOfferingId", "coachId", "courseId", "enrollmentId",
    "totalSessions", "completedSessions", "validFrom", "validUntil", "status",
    "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "coachingOfferingId", "coachId", "courseId", "enrollmentId",
    "totalSessions", "usedSessions",
    "validFrom", "validUntil",
    CASE WHEN "status" = 'EXHAUSTED' THEN 'COMPLETED' ELSE "status" END,
    "createdAt", "updatedAt"
FROM "coaching_entitlements";

DROP TABLE "coaching_entitlements";
ALTER TABLE "coaching_entitlements_new" RENAME TO "coaching_entitlements";
CREATE INDEX "coaching_entitlements_userId_status_idx" ON "coaching_entitlements"("userId", "status");
CREATE INDEX "coaching_entitlements_coachingOfferingId_idx" ON "coaching_entitlements"("coachingOfferingId");

-- New coaching sessions (old rows cleared — re-provision via seed)
CREATE TABLE "coaching_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entitlementId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "bodyMarkdown" TEXT,
    "publicationStatus" TEXT NOT NULL DEFAULT 'EMPTY',
    "publishedAt" DATETIME,
    "publishedById" TEXT,
    "progressStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_sessions_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "coaching_entitlements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coaching_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_sessions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "coaching_sessions_entitlementId_sessionNo_key" ON "coaching_sessions"("entitlementId", "sessionNo");
CREATE INDEX "coaching_sessions_userId_sessionNo_idx" ON "coaching_sessions"("userId", "sessionNo");
CREATE INDEX "coaching_sessions_coachId_scheduledAt_idx" ON "coaching_sessions"("coachId", "scheduledAt");
CREATE INDEX "coaching_sessions_publicationStatus_scheduledAt_idx" ON "coaching_sessions"("publicationStatus", "scheduledAt");

CREATE TABLE "coaching_session_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "firstViewedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "coaching_session_progress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_session_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "coaching_session_progress_sessionId_key" ON "coaching_session_progress"("sessionId");
CREATE INDEX "coaching_session_progress_userId_idx" ON "coaching_session_progress"("userId");

CREATE TABLE "coaching_session_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_session_conversations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_session_conversations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_session_conversations_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "coaching_session_conversations_sessionId_key" ON "coaching_session_conversations"("sessionId");
CREATE INDEX "coaching_session_conversations_studentId_idx" ON "coaching_session_conversations"("studentId");
CREATE INDEX "coaching_session_conversations_coachId_idx" ON "coaching_session_conversations"("coachId");

CREATE TABLE "coaching_session_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "awaitingReply" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coaching_session_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "coaching_session_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_session_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "coaching_session_messages_conversationId_createdAt_idx" ON "coaching_session_messages"("conversationId", "createdAt");

PRAGMA foreign_keys=ON;
