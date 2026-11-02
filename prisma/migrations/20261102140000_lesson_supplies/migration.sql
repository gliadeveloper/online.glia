-- AlterTable
ALTER TABLE "lessons" ADD COLUMN "supplies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
