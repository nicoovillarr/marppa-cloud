-- AlterTable
ALTER TABLE "AtomImage" ADD COLUMN "command" TEXT[] DEFAULT ARRAY[]::TEXT[];
