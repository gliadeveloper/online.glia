-- Existing members complete these details after login; public nicknames remain unchanged.
ALTER TABLE "users" ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "nickname" TEXT;

UPDATE "users" SET "nickname" = "name";
UPDATE "users" SET "name" = NULL;

ALTER TABLE "signup_drafts" ADD COLUMN "name" TEXT,
ADD COLUMN "phoneNumber" TEXT;
