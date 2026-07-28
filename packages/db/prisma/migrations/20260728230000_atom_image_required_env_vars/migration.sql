-- AlterTable
ALTER TABLE "AtomImage" ADD COLUMN "requiredEnvVars" TEXT[] DEFAULT ARRAY[]::TEXT[];
