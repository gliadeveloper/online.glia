ALTER TABLE "lessons" ADD COLUMN "scheduledStartAt" TIMESTAMP(3);

CREATE INDEX "lessons_scheduledStartAt_idx" ON "lessons"("scheduledStartAt");

CREATE TABLE "alimtalk_reservations" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reserveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alimtalk_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alimtalk_reservations_lessonId_userId_templateCode_key" ON "alimtalk_reservations"("lessonId", "userId", "templateCode");

CREATE INDEX "alimtalk_reservations_lessonId_idx" ON "alimtalk_reservations"("lessonId");

ALTER TABLE "alimtalk_reservations" ADD CONSTRAINT "alimtalk_reservations_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alimtalk_reservations" ADD CONSTRAINT "alimtalk_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
