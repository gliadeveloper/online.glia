-- Replace session-scoped, snapshot check-in sharing with user-managed coach access.
-- This intentionally removes all legacy share requests and generated snapshots.

ALTER TABLE "users" ADD COLUMN "userId" TEXT;
ALTER TABLE "signup_drafts" ADD COLUMN "userId" TEXT;

CREATE TABLE "coach_check_in_accesses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_check_in_accesses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");
CREATE UNIQUE INDEX "coach_check_in_accesses_userId_coachId_key" ON "coach_check_in_accesses"("userId", "coachId");
CREATE INDEX "coach_check_in_accesses_userId_revokedAt_idx" ON "coach_check_in_accesses"("userId", "revokedAt");
CREATE INDEX "coach_check_in_accesses_coachId_revokedAt_idx" ON "coach_check_in_accesses"("coachId", "revokedAt");

ALTER TABLE "coach_check_in_accesses"
  ADD CONSTRAINT "coach_check_in_accesses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coach_check_in_accesses"
  ADD CONSTRAINT "coach_check_in_accesses_coachId_fkey"
  FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "check_in_share_reports";
DROP TABLE "check_in_share_grants";
DROP TYPE "CheckInShareScopeType";
DROP TYPE "CheckInShareGrantStatus";
