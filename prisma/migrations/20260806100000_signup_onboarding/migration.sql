-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill existing users as onboarding-complete
UPDATE "users" SET "onboardingCompletedAt" = COALESCE("lastLoginAt", "createdAt") WHERE "onboardingCompletedAt" IS NULL;

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "age14ConfirmedAt" TIMESTAMP(3) NOT NULL,
    "marketingAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signup_drafts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "verifyCodeHash" TEXT,
    "verifyExpiresAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "marketingConsent" BOOLEAN,
    "marketingAcceptedAt" TIMESTAMP(3),
    "nickname" TEXT,
    "avatarPresetId" TEXT,
    "avatarUrl" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_userId_key" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "signup_drafts_email_idx" ON "signup_drafts"("email");

-- CreateIndex
CREATE INDEX "signup_drafts_expiresAt_idx" ON "signup_drafts"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
