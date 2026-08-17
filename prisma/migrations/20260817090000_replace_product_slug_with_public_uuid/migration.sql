-- Product URLs use an immutable public UUID. The internal Product.id remains
-- unchanged so every order and product-item foreign key stays intact.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "products" ADD COLUMN "publicId" TEXT;
UPDATE "products" SET "publicId" = gen_random_uuid()::text WHERE "publicId" IS NULL;
ALTER TABLE "products" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX "products_publicId_key" ON "products"("publicId");
-- Keep the old column temporarily for historical records and a safe deployment.
-- Application code no longer creates, edits, resolves, or links product slugs.
