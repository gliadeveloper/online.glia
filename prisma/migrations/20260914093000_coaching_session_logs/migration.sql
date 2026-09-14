-- CreateTable
CREATE TABLE "coaching_session_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coaching_session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coaching_session_logs_sessionId_createdAt_idx" ON "coaching_session_logs"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "coaching_session_logs_userId_idx" ON "coaching_session_logs"("userId");

-- AddForeignKey
ALTER TABLE "coaching_session_logs" ADD CONSTRAINT "coaching_session_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_session_logs" ADD CONSTRAINT "coaching_session_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
