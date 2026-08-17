-- Courses are addressed by their UUID primary key; course slugs are retired.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "courses" DROP COLUMN IF EXISTS "slug";

-- Existing foreign keys already use ON UPDATE CASCADE, so every dependent
-- learning, commerce, coaching, and form record retains its relationship.
CREATE TEMP TABLE "course_uuid_map" AS
SELECT "id" AS "oldId", gen_random_uuid()::text AS "newId"
FROM "courses";

UPDATE "courses" AS course
SET "id" = mapping."newId"
FROM "course_uuid_map" AS mapping
WHERE course."id" = mapping."oldId";

ALTER TABLE "courses"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
