-- Products are addressed directly by their primary key. Convert every existing
-- product ID to UUID while retaining the catalog and its commerce relationships.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The earlier public UUID transition is superseded: there is only one product ID.
DROP INDEX IF EXISTS "products_publicId_key";
ALTER TABLE "products" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "products" DROP COLUMN IF EXISTS "slug";

-- ProductItem and OrderLine are the two relational dependants of Product.id.
-- Cascading updates lets existing catalog and order data follow the new UUID.
ALTER TABLE "product_items" DROP CONSTRAINT IF EXISTS "product_items_productId_fkey";
ALTER TABLE "order_lines" DROP CONSTRAINT IF EXISTS "order_lines_productId_fkey";

ALTER TABLE "product_items"
  ADD CONSTRAINT "product_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_lines"
  ADD CONSTRAINT "order_lines_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TEMP TABLE "product_uuid_map" AS
SELECT "id" AS "oldId", gen_random_uuid()::text AS "newId"
FROM "products";

UPDATE "products" AS product
SET "id" = mapping."newId"
FROM "product_uuid_map" AS mapping
WHERE product."id" = mapping."oldId";

ALTER TABLE "products"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
