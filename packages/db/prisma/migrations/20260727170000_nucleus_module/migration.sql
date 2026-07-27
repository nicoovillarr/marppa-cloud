-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'ATOM_CREATE';
ALTER TYPE "EventType" ADD VALUE 'ATOM_CREATE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_CREATED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_START';
ALTER TYPE "EventType" ADD VALUE 'ATOM_START_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_STARTED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_TERMINATE';
ALTER TYPE "EventType" ADD VALUE 'ATOM_TERMINATE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_TERMINATED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_DELETE';
ALTER TYPE "EventType" ADD VALUE 'ATOM_DELETE_FAILED';
ALTER TYPE "EventType" ADD VALUE 'ATOM_DELETED';

-- CreateTable
CREATE TABLE "AtomImage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "registry" TEXT NOT NULL DEFAULT 'docker.io',
    "repository" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "digest" TEXT,
    "architecture" TEXT NOT NULL DEFAULT 'amd64',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sysctls" JSONB,

    CONSTRAINT "AtomImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtomImage_name_key" ON "AtomImage"("name");

-- CreateTable
CREATE TABLE "AtomEnvVar" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "atomId" TEXT NOT NULL,

    CONSTRAINT "AtomEnvVar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtomEnvVar_atomId_key_key" ON "AtomEnvVar"("atomId", "key");

-- AddForeignKey
ALTER TABLE "AtomEnvVar" ADD CONSTRAINT "AtomEnvVar_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "Atom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- The free-text `image` column is what allowed an Atom to run an arbitrary
-- image. It is replaced by a foreign key into the approved AtomImage catalog,
-- so an unapproved image is rejected by the database itself. Existing rows
-- cannot be mapped to a catalog entry, so the column is dropped outright.
DELETE FROM "Atom";

ALTER TABLE "Atom" DROP COLUMN "image";
ALTER TABLE "Atom" ADD COLUMN "imageId" INTEGER NOT NULL;
ALTER TABLE "Atom" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
ALTER TABLE "Atom" ALTER COLUMN "updatedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "AtomImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
