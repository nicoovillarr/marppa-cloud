-- AlterTable
ALTER TABLE "WorkerFamily" ADD COLUMN "architecture" TEXT NOT NULL DEFAULT 'amd64';
ALTER TABLE "WorkerFamily" ALTER COLUMN "architecture" DROP DEFAULT;
ALTER TABLE "WorkerFamily" ADD COLUMN "deprecatedAt" TIMESTAMP(3);
ALTER TABLE "WorkerFamily" ADD COLUMN "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkerFamily" ADD CONSTRAINT "WorkerFamily_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "WorkerFlavor" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WorkerFlavor" ADD COLUMN "pricePerHourCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkerFlavor" ADD COLUMN "deprecatedAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "WorkerFlavor_familyId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "WorkerFlavor_familyId_name_version_key" ON "WorkerFlavor"("familyId", "name", "version");

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN "cpuCores" DOUBLE PRECISION;
ALTER TABLE "Worker" ADD COLUMN "ramMB" INTEGER;
ALTER TABLE "Worker" ADD COLUMN "diskGB" INTEGER;

UPDATE "Worker" AS w
SET "cpuCores" = f."cpuCores",
    "ramMB"    = f."ramMB",
    "diskGB"   = f."diskGB"
FROM "WorkerFlavor" AS f
WHERE f."id" = w."flavorId";

ALTER TABLE "Worker" ALTER COLUMN "cpuCores" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "ramMB" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "diskGB" SET NOT NULL;
