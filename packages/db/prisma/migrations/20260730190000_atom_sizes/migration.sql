-- CreateTable
CREATE TABLE "AtomSize" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cpuCores" DOUBLE PRECISION NOT NULL,
    "ramMB" INTEGER NOT NULL,
    "pricePerHourCents" INTEGER NOT NULL DEFAULT 0,
    "deprecatedAt" TIMESTAMP(3),

    CONSTRAINT "AtomSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtomSize_name_version_key" ON "AtomSize"("name", "version");

-- InsertSeededSizes
INSERT INTO "AtomSize" ("name", "cpuCores", "ramMB") VALUES
    ('nano', 0.25, 256),
    ('small', 0.5, 512),
    ('medium', 1, 1024),
    ('large', 2, 4096);

-- AlterTable
ALTER TABLE "AtomImage" ADD COLUMN "defaultSizeId" INTEGER;

UPDATE "AtomImage"
SET "defaultSizeId" = (SELECT "id" FROM "AtomSize" WHERE "name" = 'medium');

ALTER TABLE "AtomImage" ALTER COLUMN "defaultSizeId" SET NOT NULL;

ALTER TABLE "AtomImage" ADD CONSTRAINT "AtomImage_defaultSizeId_fkey" FOREIGN KEY ("defaultSizeId") REFERENCES "AtomSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Atom" ADD COLUMN "sizeId" INTEGER;
ALTER TABLE "Atom" ADD COLUMN "cpuCores" DOUBLE PRECISION;
ALTER TABLE "Atom" ADD COLUMN "ramMB" INTEGER;

UPDATE "Atom" AS a
SET "sizeId"   = s."id",
    "cpuCores" = s."cpuCores",
    "ramMB"    = s."ramMB"
FROM "AtomSize" AS s
WHERE s."name" = 'medium';

ALTER TABLE "Atom" ALTER COLUMN "sizeId" SET NOT NULL;
ALTER TABLE "Atom" ALTER COLUMN "cpuCores" SET NOT NULL;
ALTER TABLE "Atom" ALTER COLUMN "ramMB" SET NOT NULL;

ALTER TABLE "Atom" ADD CONSTRAINT "Atom_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "AtomSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
