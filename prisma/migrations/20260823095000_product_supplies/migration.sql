-- AlterTable
ALTER TABLE "products" ADD COLUMN "supplies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
